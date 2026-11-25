import type { ParticipantIdentity } from "../meeting/participant.ts";
import type { ChatAudience } from "./chat-message.ts";
import type { RecorderFailureReason } from "./conferencing-error.ts";
import type {
  ConsentAnswer,
  ConsentEnvelope,
  ConsentMessage,
  RecordingConsentState,
  RecordingRequestId,
} from "./recording-consent.ts";

/**
 * Everything that can move the consent state. `request` to `dismiss-notice` are this
 * participant's actions; `received`, `joined`, `left` and `disconnected` come from the
 * room; `recorder-*` and `command-failed` report how the last commands went.
 */
export type ConsentEvent =
  | {
      readonly type: "request";
      readonly requestId: RecordingRequestId;
      /** The remote participants present now. */
      readonly present: readonly ParticipantIdentity[];
      readonly admissionKeys?: ReadonlyMap<ParticipantIdentity, string | undefined>;
    }
  | { readonly type: "answer"; readonly answer: ConsentAnswer }
  | { readonly type: "withdraw" }
  | { readonly type: "stop" }
  | { readonly type: "dismiss-notice" }
  | { readonly type: "received"; readonly envelope: ConsentEnvelope }
  | {
      readonly type: "joined";
      readonly identity: ParticipantIdentity;
      readonly admissionId: number;
      readonly admissionKey: string | undefined;
    }
  | { readonly type: "left"; readonly identity: ParticipantIdentity }
  | { readonly type: "disconnected" }
  | { readonly type: "recorder-prepared" }
  | { readonly type: "recorder-started" }
  | { readonly type: "recorder-stopped-itself"; readonly reason: RecorderFailureReason }
  | {
      readonly type: "command-failed";
      readonly command: ConsentCommand;
      readonly reason?: RecorderFailureReason;
    };

/**
 * Prepare the encoder before announcing and start live inputs after announcing.
 * On stop, cut inputs immediately and announce while encoding and writing finish.
 */
export type ConsentCommand =
  | { readonly type: "send"; readonly to: ChatAudience; readonly message: ConsentMessage }
  | { readonly type: "prepare-recorder"; readonly requestId: RecordingRequestId }
  | { readonly type: "start-recorder"; readonly requestId: RecordingRequestId }
  | { readonly type: "stop-recorder" };

export interface ConsentStep {
  readonly state: RecordingConsentState;
  readonly commands: readonly ConsentCommand[];
}
