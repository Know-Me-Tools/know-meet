import {
  type ConnectionState,
  type DisconnectReason,
  err,
  isInRoom,
  type LocalParticipant,
  meetingErrors,
  ok,
  type ParticipantIdentity,
  type RemoteParticipant,
  type TrackKind,
  withLocalTrackMuted,
} from "@know-meet/domain";
import type {
  ConnectError,
  MediaTarget,
  RealtimeRoom,
  RoomCredentials,
  RoomSnapshot,
} from "../ports.ts";

/** A media element bound to a target through `attachMedia` and not yet detached. */
export interface FakeAttachment {
  readonly target: MediaTarget;
  readonly element: HTMLMediaElement;
}

/**
 * An in-memory RealtimeRoom for tests and offline development. It keeps the port's
 * snapshot contract and lets a test play the media server's part.
 */
export interface FakeRealtimeRoom extends RealtimeRoom {
  /** Every credentials object passed to `connect`, in order. */
  connectCalls(): readonly RoomCredentials[];
  /** Live media bindings. */
  attachments(): readonly FakeAttachment[];
  /** Makes the next `connect` fail with this error; the room returns to idle. */
  failNextConnect(error: ConnectError): void;
  /** Makes enabling this device fail as if the browser refused it. */
  denyPermission(kind: TrackKind): void;
  /** Adds a remote participant, or replaces the one with the same identity in place. */
  setRemote(remote: RemoteParticipant): void;
  removeRemote(identity: ParticipantIdentity): void;
  /** Moves the connection, for example to `reconnecting` or a lost `disconnected`. */
  setConnection(connection: ConnectionState): void;
}

const INITIAL: RoomSnapshot = { connection: { status: "idle" }, local: null, remotes: [] };

export function createFakeRealtimeRoom(): FakeRealtimeRoom {
  let snapshot = INITIAL;
  let connectCalls: readonly RoomCredentials[] = [];
  let attachments: readonly FakeAttachment[] = [];
  let nextConnectFailure: ConnectError | null = null;
  let denied: ReadonlySet<TrackKind> = new Set<TrackKind>();
  const listeners = new Set<() => void>();

  const publish = (next: RoomSnapshot): void => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  return {
    connectCalls: () => connectCalls,
    attachments: () => attachments,
    failNextConnect: (error) => {
      nextConnectFailure = error;
    },
    denyPermission: (kind) => {
      denied = new Set([...denied, kind]);
    },
    setRemote: (remote) => publish({ ...snapshot, remotes: upsert(snapshot.remotes, remote) }),
    removeRemote: (identity) => {
      const remotes = snapshot.remotes.filter((entry) => entry.identity !== identity);
      publish({ ...snapshot, remotes });
    },
    setConnection: (connection) => publish({ ...snapshot, connection }),
    connect: async (credentials) => {
      connectCalls = [...connectCalls, credentials];
      publish({ ...snapshot, connection: { status: "connecting" } });
      const failure = nextConnectFailure;
      nextConnectFailure = null;
      if (failure !== null) {
        publish(INITIAL);
        return err(failure);
      }
      publish({ connection: { status: "connected" }, local: localFor(credentials), remotes: [] });
      return ok(undefined);
    },
    disconnect: async () => {
      publish(disconnected("left"));
    },
    setMediaEnabled: async (kind, enabled) => {
      const local = snapshot.local;
      if (local === null) return err(meetingErrors.connectionLost());
      if (!isInRoom(snapshot.connection)) return err(meetingErrors.connectionLost());
      if (enabled && denied.has(kind)) return err(meetingErrors.permissionDenied(kind));
      publish({ ...snapshot, local: withLocalTrackMuted(local, kind, !enabled) });
      return ok(undefined);
    },
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    attachMedia: (target, element) => {
      const attachment: FakeAttachment = { target, element };
      attachments = [...attachments, attachment];
      return () => {
        attachments = attachments.filter((entry) => entry !== attachment);
      };
    },
  };
}

/** The local participant as the media server reports it right after joining. */
function localFor(credentials: RoomCredentials): LocalParticipant {
  return {
    kind: "local",
    identity: credentials.identity,
    displayName: credentials.identity,
    microphone: { muted: true },
    camera: { muted: true },
  };
}

function disconnected(reason: DisconnectReason): RoomSnapshot {
  return { connection: { status: "disconnected", reason }, local: null, remotes: [] };
}

function upsert(
  remotes: readonly RemoteParticipant[],
  remote: RemoteParticipant,
): readonly RemoteParticipant[] {
  const known = remotes.some((entry) => entry.identity === remote.identity);
  if (!known) return [...remotes, remote];
  return remotes.map((entry) => (entry.identity === remote.identity ? remote : entry));
}
