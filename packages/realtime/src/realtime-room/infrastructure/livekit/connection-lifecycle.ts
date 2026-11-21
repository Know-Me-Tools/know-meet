import type { ConnectError, ConnectOptions, RoomCredentials } from "@know-meet/application";
import { DEFAULT_DEVICE_CHOICE, err, meetingErrors, ok, type Result } from "@know-meet/domain";
import { ConnectionErrorReason, Room, type RoomOptions } from "livekit-client";
import {
  CONNECTED,
  CONNECTING,
  CONNECTION_LOST,
  IDLE,
  LEFT,
  toLiveConnection,
} from "../../domain/connection-mapping.ts";
import { errorName, isTokenRejection, mapConnectError } from "../../domain/error-mapping.ts";
import { startAudioAfterJoin } from "./audio-playback.ts";
import { bindRoomEvents, type RoomEventHandlers } from "./room-events.ts";
import type { Session, SessionHost } from "./session-host.ts";

/** `ConnectionErrorReason.NotAllowed`: the server refused the token. */
const TOKEN_REFUSED: number = ConnectionErrorReason.NotAllowed;

/** What the features do at the edges of a session. */
export interface SessionFeatures {
  /** Room options for this connect, with the lobby's device choice applied. */
  roomOptionsFor(options: ConnectOptions): RoomOptions;
  /** The SDK room exists and is about to connect: register stream handlers. */
  onSessionStart(session: Session): void;
  /** A new connect begins, or the guest left: clear per-session state (chat, effect). */
  onSessionReset(): void;
}

export interface ConnectionLifecycle {
  connect(
    credentials: RoomCredentials,
    options?: ConnectOptions,
  ): Promise<Result<void, ConnectError>>;
  disconnect(): Promise<void>;
}

/**
 * Connect and disconnect. It opens no connection until `connect`, so a refused token request
 * never reaches the media server, and it tries once: a refused token is not retried, and
 * neither is an unreachable server.
 */
export function createConnectionLifecycle(
  host: SessionHost,
  features: SessionFeatures,
): ConnectionLifecycle {
  let pendingConnect: number | null = null;

  /** The SDK gave up reconnecting, or the server ended the session. The guest did not leave. */
  const onSessionEnded = (id: number): void => {
    const lost = host.session();
    if (lost === null || !host.isCurrent({ id }) || pendingConnect === id) return;
    host.setSession(null);
    host.setConnection(CONNECTION_LOST);
    void host.release(lost);
  };

  const handlersFor = (id: number): RoomEventHandlers => ({
    onChange: () => {
      if (host.isCurrent({ id })) host.scheduleRefresh();
    },
    onConnectionState: (sdkState) => {
      const next = toLiveConnection(sdkState);
      if (next !== null && host.isCurrent({ id })) host.setConnection(next);
    },
    onDisconnected: () => onSessionEnded(id),
    onAudioPlayback: (playing) => {
      host.report({ type: "audio-playback", playing });
      if (host.isCurrent({ id })) host.scheduleRefresh();
    },
  });

  const attempt = async (
    room: Room,
    credentials: RoomCredentials,
  ): Promise<Result<void, unknown>> => {
    try {
      await room.connect(credentials.url, credentials.token);
      return ok(undefined);
    } catch (error) {
      return err(error);
    }
  };

  const failConnect = async (error: unknown): Promise<Result<void, ConnectError>> => {
    const tokenRejected = isTokenRejection(error, TOKEN_REFUSED);
    host.report({ type: "connect-failed", errorName: errorName(error), tokenRejected });
    const failed = host.session();
    host.setSession(null);
    host.setConnection(IDLE);
    if (failed !== null) await host.release(failed);
    return err(mapConnectError(error, TOKEN_REFUSED));
  };

  const connect = async (
    credentials: RoomCredentials,
    options?: ConnectOptions,
  ): Promise<Result<void, ConnectError>> => {
    const previous = host.session();
    if (previous !== null) {
      host.setSession(null);
      await host.release(previous);
    }
    features.onSessionReset();
    const id = host.nextSessionId();
    const room = new Room(features.roomOptionsFor(options ?? { devices: DEFAULT_DEVICE_CHOICE }));
    const session: Session = { id, room, unbind: bindRoomEvents(room, handlersFor(id)) };
    host.setSession(session);
    features.onSessionStart(session);
    pendingConnect = id;
    host.setConnection(CONNECTING);
    const outcome = await attempt(room, credentials);
    if (pendingConnect === id) pendingConnect = null;
    // `disconnect` ran while connecting: it already tore the room down and reported `left`.
    if (!host.isCurrent(session)) return err(meetingErrors.connectionLost());
    if (!outcome.ok) return failConnect(outcome.error);
    host.setConnection(CONNECTED);
    startAudioAfterJoin(room, host);
    return ok(undefined);
  };

  const disconnect = async (): Promise<void> => {
    const ending = host.session();
    host.setSession(null);
    if (ending !== null) await host.release(ending);
    features.onSessionReset();
    host.setConnection(LEFT);
  };

  return { connect, disconnect };
}
