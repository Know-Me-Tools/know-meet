import { type ConnectionState, isInRoom } from "@know-meet/domain";
import type { Room } from "livekit-client";
import type { DiagnosticSink } from "../../application/diagnostics.ts";
import { IDLE, sameConnection } from "../../domain/connection-mapping.ts";
import { errorName } from "../../domain/error-mapping.ts";

/** One SDK room from `connect` until it is left or lost. A new `connect` makes a new one. */
export interface Session {
  readonly id: number;
  readonly room: Room;
  readonly unbind: () => void;
}

/**
 * The adapter's shared state: the current session and connection, and the refresh that turns
 * them into a snapshot. Every feature reads the session through it, so a feature acting on a
 * session that has since ended can tell (`isCurrent`).
 */
export interface SessionHost {
  readonly report: DiagnosticSink;
  session(): Session | null;
  connection(): ConnectionState;
  /** The session while joined (connected or reconnecting); room actions need it. */
  joined(): Session | null;
  /** The session while connected; sends need a live link, not a reconnecting one. */
  live(): Session | null;
  /** True while `candidate` (a session, or just its id) is still the current session. */
  isCurrent(candidate: { readonly id: number }): boolean;
  /** Re-reads the SDK now and publishes a new snapshot if anything changed. */
  refresh(): void;
  /** Refreshes one microtask later, batched (see `scheduleRefresh` below). */
  scheduleRefresh(): void;
  setSession(next: Session | null): void;
  setConnection(next: ConnectionState): void;
  nextSessionId(): number;
  /** Removes our listeners, then disposes the room: disconnect, stop local tracks, drop globals. */
  release(ended: Session): Promise<void>;
}

/** Called by every refresh with the current room (null when there is none). */
export type RefreshHandler = (room: Room | null, connection: ConnectionState) => void;

export function createSessionHost(report: DiagnosticSink, onRefresh: RefreshHandler): SessionHost {
  let session: Session | null = null;
  let connection: ConnectionState = IDLE;
  let sessionCount = 0;
  let refreshQueued = false;

  const refresh = (): void => onRefresh(session?.room ?? null, connection);

  return {
    report,
    session: () => session,
    connection: () => connection,
    joined: () => (session !== null && isInRoom(connection) ? session : null),
    live: () => (session !== null && connection.status === "connected" ? session : null),
    isCurrent: (candidate) => session !== null && session.id === candidate.id,
    refresh,
    /**
     * SDK events fire mid-update (for example `TrackUnsubscribed` before the publication drops
     * its track), so changes are read one microtask later, batched.
     */
    scheduleRefresh: () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        refresh();
      });
    },
    setSession: (next) => {
      session = next;
    },
    setConnection: (next) => {
      if (!sameConnection(connection, next)) {
        report({ type: "connection-changed", connection: next });
      }
      connection = next;
      refresh();
    },
    nextSessionId: () => {
      sessionCount += 1;
      return sessionCount;
    },
    release: async (ended) => {
      ended.unbind();
      try {
        await ended.room.dispose();
      } catch (error) {
        report({ type: "teardown-failed", errorName: errorName(error) });
      }
    },
  };
}
