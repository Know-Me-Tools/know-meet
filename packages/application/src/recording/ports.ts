import type {
  RecorderFailed,
  RecorderFailureReason,
  RecordingRequestId,
  Result,
  Support,
} from "@know-meet/domain";

/**
 * Records the meeting into this browser's own storage (wc10: composited canvas and mixed
 * audio into `MediaRecorder`, written to OPFS). Only the recording consent use cases start
 * or stop it; nothing else may.
 *
 * - `start` begins a new file named by the request id. It does not ask for consent; the
 *   caller has it.
 * - `stop` finalises and keeps everything written, even a partial file. It never deletes.
 *   Calling it when not recording does nothing and succeeds.
 * - When the recorder has to stop by itself (storage quota, lost tracks) it finalises what
 *   it wrote and then calls the `onStoppedItself` listeners.
 * - Nothing it writes is sent to any server.
 */
export interface LocalRecorder {
  /** Whether this browser can record locally at all (MediaRecorder and OPFS). */
  readonly support: Support;
  start(requestId: RecordingRequestId): Promise<Result<void, RecorderFailed>>;
  stop(): Promise<Result<void, RecorderFailed>>;
  onStoppedItself(listener: (reason: RecorderFailureReason) => void): () => void;
}
