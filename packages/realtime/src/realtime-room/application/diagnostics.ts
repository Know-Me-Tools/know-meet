import type { ConnectionState, DeviceKind, TrackKind } from "@know-meet/domain";

/** Which text channel a message event is about. */
export type MessageChannel = "chat" | "consent";

/** Why a received text stream was not delivered. */
export type DropReason = "too-large" | "unreadable" | "malformed";

/**
 * What the adapter reports for debugging a meeting. Carries error names only, never messages,
 * tokens, URLs, message text or device labels, so a sink may forward it to logs.
 */
export type RealtimeDiagnostic =
  | { readonly type: "connection-changed"; readonly connection: ConnectionState }
  | { readonly type: "connect-failed"; readonly errorName: string; readonly tokenRejected: boolean }
  | { readonly type: "media-failed"; readonly kind: TrackKind; readonly errorName: string }
  /** `playing: false` means the browser blocked audio until a user gesture calls startAudio. */
  | { readonly type: "audio-playback"; readonly playing: boolean }
  | { readonly type: "teardown-failed"; readonly errorName: string }
  | { readonly type: "screen-share-failed"; readonly errorName: string }
  | {
      readonly type: "message-send-failed";
      readonly channel: MessageChannel;
      readonly errorName: string;
    }
  | {
      readonly type: "message-dropped";
      readonly channel: MessageChannel;
      readonly reason: DropReason;
    }
  | { readonly type: "device-switch-failed"; readonly kind: DeviceKind; readonly errorName: string }
  | { readonly type: "background-effect-failed"; readonly errorName: string };

export type DiagnosticSink = (diagnostic: RealtimeDiagnostic) => void;

export const ignoreDiagnostic: DiagnosticSink = () => {};
