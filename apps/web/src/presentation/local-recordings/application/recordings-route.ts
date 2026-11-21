// TJ-ARCH-MOB-001 compliant
// /recordings sub-states in the URL hash (shape recordings-library.md §2): the library
// (no hash) and `#recording:<id>` for one recording. The id is validated with the
// domain parser, never trusted raw; the hash never reaches a server and no request is
// keyed by it (RL-12). An id that does not parse is "not found".
import { parseRecordingRequestId, type RecordingRequestId } from "@know-meet/domain";
import { parseHashRoute } from "../../shared/use-hash-route";

export type RecordingsView =
  | { readonly kind: "list" }
  | { readonly kind: "detail"; readonly id: RecordingRequestId }
  | { readonly kind: "not-found" };

const RECORDING_VIEW = "recording";

export function resolveRecordingsView(hash: string): RecordingsView {
  const route = parseHashRoute(hash);
  if (route.view !== RECORDING_VIEW) return { kind: "list" };
  const id = parseRecordingRequestId(route.arg);
  return id === null ? { kind: "not-found" } : { kind: "detail", id };
}

/** Hash (without `#`) for `<Link hash>`: `recording:<id>`. */
export function recordingDetailHash(id: RecordingRequestId): string {
  return `${RECORDING_VIEW}:${id}`;
}
