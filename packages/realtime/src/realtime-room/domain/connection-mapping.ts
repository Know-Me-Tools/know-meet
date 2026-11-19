import type { ConnectionState } from "@know-meet/domain";

export const IDLE: ConnectionState = { status: "idle" };
export const CONNECTING: ConnectionState = { status: "connecting" };
export const CONNECTED: ConnectionState = { status: "connected" };
export const RECONNECTING: ConnectionState = { status: "reconnecting" };
export const LEFT: ConnectionState = { status: "disconnected", reason: "left" };
export const CONNECTION_LOST: ConnectionState = {
  status: "disconnected",
  reason: "connection-lost",
};

/**
 * Maps the media SDK's connection state (its string values: `connecting`, `connected`,
 * `reconnecting`, `signalReconnecting`, `disconnected`) to the domain state. Returns null for
 * `disconnected` and anything unknown: why a session ended is known only to the adapter (the
 * guest left, or the link was lost), so the adapter sets that state itself.
 */
export function toLiveConnection(sdkState: string): ConnectionState | null {
  switch (sdkState) {
    case "connecting":
      return CONNECTING;
    case "connected":
      return CONNECTED;
    case "reconnecting":
    case "signalReconnecting":
      return RECONNECTING;
    default:
      return null;
  }
}

export function sameConnection(a: ConnectionState, b: ConnectionState): boolean {
  return a.status === b.status && reasonOf(a) === reasonOf(b);
}

function reasonOf(state: ConnectionState): string | null {
  return state.status === "disconnected" ? state.reason : null;
}
