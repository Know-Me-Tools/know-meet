// TJ-ARCH-MOB-001 compliant
// /history sub-states in the URL hash (shape local-history.md §2): the list (no
// hash), `#meeting:<id>` for one meeting, and "not found" for a meeting hash whose
// id does not parse. The hash is never sent to a server and no request is keyed by
// the id (WC-7, LH-12); the id is validated with the domain parser, never trusted raw.
import { type MeetingHistoryId, parseMeetingHistoryId } from "@know-meet/domain";
import { parseHashRoute } from "../../shared/use-hash-route";

export type HistoryView =
  | { readonly kind: "list" }
  | { readonly kind: "detail"; readonly id: MeetingHistoryId }
  | { readonly kind: "not-found" };

const MEETING_VIEW = "meeting";

export function resolveHistoryView(hash: string): HistoryView {
  const route = parseHashRoute(hash);
  if (route.view !== MEETING_VIEW) return { kind: "list" };
  const id = parseMeetingHistoryId(route.arg);
  return id === null ? { kind: "not-found" } : { kind: "detail", id };
}

/** Hash (without `#`) for `<Link hash>`: `meeting:<id>`. */
export function meetingHash(id: MeetingHistoryId): string {
  return `${MEETING_VIEW}:${id}`;
}

/** Hash (without `#`) of a recording saved in this browser, on the hosted /recordings. */
export function recordingHash(id: string): string {
  return `recording:${id}`;
}
