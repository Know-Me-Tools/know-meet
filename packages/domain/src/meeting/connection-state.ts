/** Why a meeting connection ended: the guest left, or the network could not be restored. */
export type DisconnectReason = "left" | "connection-lost";

/**
 * Where this client is in its connection to the meeting room. `reconnecting` keeps the
 * room on screen (room state R6); `disconnected` with `connection-lost` is the
 * "You were disconnected" view (R7).
 */
export type ConnectionState =
  | { readonly status: "idle" }
  | { readonly status: "connecting" }
  | { readonly status: "connected" }
  | { readonly status: "reconnecting" }
  | { readonly status: "disconnected"; readonly reason: DisconnectReason };

/** True while the room is joined, including during a reconnect attempt. */
export function isInRoom(state: ConnectionState): boolean {
  return state.status === "connected" || state.status === "reconnecting";
}
