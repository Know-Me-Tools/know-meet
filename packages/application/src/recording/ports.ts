import type {
  ParticipantIdentity,
  RecorderFailed,
  RecorderFailureReason,
  RecordingRequestId,
  Result,
  Support,
} from "@know-meet/domain";

/** Eligibility for one recording. Changes and abort take effect at live inputs immediately. */
export interface RecordingCapturePolicy {
  readonly signal: AbortSignal;
  allows(identity: ParticipantIdentity, admissionKey?: string): boolean;
  subscribe(listener: () => void): () => void;
}

/** Records into this browser's own storage. Only the consent use cases start or stop it. */
export interface LocalRecorder {
  /** Whether this browser can record locally at all (MediaRecorder and OPFS). */
  readonly support: Support;
  /** Starts the native encoder on isolated outputs while live meeting inputs stay gated. */
  prepare(
    requestId: RecordingRequestId,
    capture?: RecordingCapturePolicy,
  ): Promise<Result<void, RecorderFailed>>;
  /** Admits live meeting inputs to the prepared encoder after the start announcement. */
  start(requestId: RecordingRequestId): Result<void, RecorderFailed>;
  /** Cuts inputs before returning the promise for the named recording’s finalization. */
  stop(requestId?: RecordingRequestId): Promise<Result<void, RecorderFailed>>;
  /** Production recorders identify the failing recording, including after Stop. */
  onStoppedItself(
    listener: (reason: RecorderFailureReason, requestId?: RecordingRequestId) => void,
  ): () => void;
}
