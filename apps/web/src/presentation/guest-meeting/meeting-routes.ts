// TJ-ARCH-MOB-001 compliant
// Where the room code travels in the URL (web-release-acceptance.md section 0: a shared
// link and a reload both work). The code sits in the hash, read with the existing
// hash-route helpers, so the route tree needs no search-param schema:
//   /join#start:km-4fq-82x   lobby for a meeting this guest just started
//   /join#join:km-4fq-82x    lobby for a code someone shared (the join link)
//   /meet#room:km-4fq-82x    the meeting room; `?blocked=camera,microphone` after a join
//                            in which the browser refused those devices
// The release specs read the code from `km-room-code`, never from the URL.
import type { TrackKind } from "@know-meet/domain";
import { type HashRoute, toHash } from "../shared/use-hash-route";

export type LobbyRole = "starter" | "joiner";

export interface LobbyLocation {
  readonly role: LobbyRole;
  /** As carried by the URL; parsed by the join use case, never trusted here. */
  readonly code: string;
}

export function lobbyHash(code: string, role: LobbyRole): string {
  return toHash(role === "starter" ? "start" : "join", code);
}

export function roomHash(code: string, blocked: readonly TrackKind[]): string {
  return blocked.length === 0
    ? toHash("room", code)
    : toHash("room", code, { blocked: blocked.join(",") });
}

export function readLobbyLocation(route: HashRoute): LobbyLocation | null {
  if (route.arg === null || route.arg.trim() === "") return null;
  return { role: route.view === "start" ? "starter" : "joiner", code: route.arg.trim() };
}

export function readRoomCode(route: HashRoute): string | null {
  return route.view === "room" && route.arg !== null && route.arg.trim() !== ""
    ? route.arg.trim()
    : null;
}

export function readBlockedDevices(route: HashRoute): readonly TrackKind[] {
  const raw = route.params["blocked"] ?? "";
  return raw
    .split(",")
    .filter((kind): kind is TrackKind => kind === "camera" || kind === "microphone");
}

/** The link a guest shares: it opens the lobby for this code. */
export function joinLink(code: string): string {
  return `${window.location.origin}/join#${lobbyHash(code, "joiner")}`;
}
