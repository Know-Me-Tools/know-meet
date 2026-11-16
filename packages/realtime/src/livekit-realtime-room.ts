import type {
  ConnectError,
  MediaError,
  MediaTarget,
  RealtimeRoom,
  RoomCredentials,
} from "@know-meet/application";
import {
  type ConnectionState,
  err,
  isInRoom,
  meetingErrors,
  ok,
  type Result,
  type TrackKind,
} from "@know-meet/domain";
import { ConnectionErrorReason, Room, type RoomOptions } from "livekit-client";
import {
  CONNECTED,
  CONNECTING,
  CONNECTION_LOST,
  IDLE,
  LEFT,
  sameConnection,
  toLiveConnection,
} from "./connection-mapping.ts";
import { type DiagnosticSink, ignoreDiagnostic } from "./diagnostics.ts";
import { errorName, isTokenRejection, mapConnectError, mapMediaError } from "./error-mapping.ts";
import { setLocalMediaEnabled } from "./livekit/media-control.ts";
import { bindRoomEvents, type RoomEventHandlers } from "./livekit/room-events.ts";
import { readRoomFacts } from "./livekit/room-facts.ts";
import { createTrackResolver } from "./livekit/track-resolver.ts";
import { createMediaBindings } from "./media-bindings.ts";
import { createSnapshotStore } from "./snapshot-store.ts";

export interface LiveKitRealtimeRoomOptions {
  /**
   * Let the SDK pause remote video whose element is hidden or small. Off by default: a
   * two-person call gains little, and a hidden or background tab would stop video (README).
   */
  readonly adaptiveStream?: boolean;
  /** Let the publisher pause simulcast layers nobody watches. On by default. */
  readonly dynacast?: boolean;
  /** Receives connection, failure and audio-playback events. Never receives a token. */
  readonly onDiagnostic?: DiagnosticSink;
}

/** One SDK room from `connect` until it is left or lost. A new `connect` makes a new one. */
interface Session {
  readonly id: number;
  readonly room: Room;
  readonly unbind: () => void;
}

/** `ConnectionErrorReason.NotAllowed`: the server refused the token. */
const TOKEN_REFUSED: number = ConnectionErrorReason.NotAllowed;

/**
 * The RealtimeRoom port over livekit-client. Nothing it returns names an SDK type. It opens
 * no connection until `connect`, so a refused token request never reaches the media server.
 */
export function createLiveKitRealtimeRoom(options: LiveKitRealtimeRoomOptions = {}): RealtimeRoom {
  const report = options.onDiagnostic ?? ignoreDiagnostic;
  const roomOptions: RoomOptions = {
    adaptiveStream: options.adaptiveStream ?? false,
    dynacast: options.dynacast ?? true,
    webAudioMix: false,
  };
  const store = createSnapshotStore();
  const bindings = createMediaBindings();
  let session: Session | null = null;
  let pendingConnect: number | null = null;
  let connection: ConnectionState = IDLE;
  let sessionCount = 0;
  let refreshQueued = false;

  const isCurrent = (id: number): boolean => session !== null && session.id === id;

  /** Re-reads the SDK, publishes a new snapshot if anything changed, and re-binds media. */
  const refresh = (): void => {
    const room = session?.room ?? null;
    store.update(readRoomFacts(room, connection));
    bindings.reconcile(createTrackResolver(room));
  };

  /**
   * SDK events fire mid-update (for example `TrackUnsubscribed` before the publication drops
   * its track), so participant changes are read one microtask later, batched.
   */
  const scheduleRefresh = (): void => {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      refresh();
    });
  };

  const setConnection = (next: ConnectionState): void => {
    if (!sameConnection(connection, next)) report({ type: "connection-changed", connection: next });
    connection = next;
    refresh();
  };

  /** Removes our listeners, then disposes the room: disconnect, stop local tracks, drop globals. */
  const release = async (ended: Session): Promise<void> => {
    ended.unbind();
    try {
      await ended.room.dispose();
    } catch (error) {
      report({ type: "teardown-failed", errorName: errorName(error) });
    }
  };

  /** The SDK gave up reconnecting, or the server ended the session. The guest did not leave. */
  const onSessionEnded = (id: number): void => {
    if (session === null || !isCurrent(id) || pendingConnect === id) return;
    const lost = session;
    session = null;
    setConnection(CONNECTION_LOST);
    void release(lost);
  };

  const handlersFor = (id: number): RoomEventHandlers => ({
    onChange: () => {
      if (isCurrent(id)) scheduleRefresh();
    },
    onConnectionState: (sdkState) => {
      const next = toLiveConnection(sdkState);
      if (next !== null && isCurrent(id)) setConnection(next);
    },
    onDisconnected: () => onSessionEnded(id),
    onAudioPlayback: (playing) => report({ type: "audio-playback", playing }),
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
    report({ type: "connect-failed", errorName: errorName(error), tokenRejected });
    const failed = session;
    session = null;
    setConnection(IDLE);
    if (failed !== null) await release(failed);
    // One attempt only: a refused token is not retried, and neither is an unreachable server.
    return err(mapConnectError(error, TOKEN_REFUSED));
  };

  /**
   * Playback of remote audio needs a user gesture. Join starts from a click, so this runs
   * close to it; if the browser still blocks audio, `audio-playback` reports `playing: false`
   * and remote audio stays silent until the page calls startAudio from another gesture
   * (not exposed by the port yet; see README).
   */
  const startAudio = (room: Room): void => {
    void room.startAudio().catch(() => report({ type: "audio-playback", playing: false }));
  };

  const connect = async (credentials: RoomCredentials): Promise<Result<void, ConnectError>> => {
    if (session !== null) {
      const previous = session;
      session = null;
      await release(previous);
    }
    sessionCount += 1;
    const id = sessionCount;
    const room = new Room(roomOptions);
    session = { id, room, unbind: bindRoomEvents(room, handlersFor(id)) };
    pendingConnect = id;
    setConnection(CONNECTING);
    const outcome = await attempt(room, credentials);
    if (pendingConnect === id) pendingConnect = null;
    // `disconnect` ran while connecting: it already tore the room down and reported `left`.
    if (!isCurrent(id)) return err(meetingErrors.connectionLost());
    if (!outcome.ok) return failConnect(outcome.error);
    setConnection(CONNECTED);
    startAudio(room);
    return ok(undefined);
  };

  const disconnect = async (): Promise<void> => {
    const ending = session;
    session = null;
    if (ending !== null) await release(ending);
    setConnection(LEFT);
  };

  const setMediaEnabled = async (
    kind: TrackKind,
    enabled: boolean,
  ): Promise<Result<void, MediaError>> => {
    const active = session;
    if (active === null || !isInRoom(connection)) return err(meetingErrors.connectionLost());
    try {
      await setLocalMediaEnabled(active.room, kind, enabled);
    } catch (error) {
      report({ type: "media-failed", kind, errorName: errorName(error) });
      if (session === active) refresh();
      return err(mapMediaError(error, kind));
    }
    if (session !== active) return err(meetingErrors.connectionLost());
    refresh();
    return ok(undefined);
  };

  return {
    connect,
    disconnect,
    setMediaEnabled,
    getSnapshot: store.get,
    subscribe: store.subscribe,
    attachMedia: (target: MediaTarget, element: HTMLMediaElement) =>
      bindings.bind(target, element, createTrackResolver(session?.room ?? null)),
  };
}
