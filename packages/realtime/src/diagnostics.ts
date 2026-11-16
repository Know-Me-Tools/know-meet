import type { ConnectionState, TrackKind } from "@know-meet/domain";

/**
 * What the adapter reports for debugging a meeting. Carries error names only, never messages,
 * tokens or URLs, so a sink may forward it to logs.
 */
export type RealtimeDiagnostic =
  | { readonly type: "connection-changed"; readonly connection: ConnectionState }
  | { readonly type: "connect-failed"; readonly errorName: string; readonly tokenRejected: boolean }
  | { readonly type: "media-failed"; readonly kind: TrackKind; readonly errorName: string }
  /** `playing: false` means the browser blocked audio until a user gesture calls startAudio. */
  | { readonly type: "audio-playback"; readonly playing: boolean }
  | { readonly type: "teardown-failed"; readonly errorName: string };

export type DiagnosticSink = (diagnostic: RealtimeDiagnostic) => void;

export const ignoreDiagnostic: DiagnosticSink = () => {};
