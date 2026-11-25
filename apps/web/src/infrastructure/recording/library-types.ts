// TJ-ARCH-MOB-001 compliant
import type { RecordingRequestId, Result, Support } from "@know-meet/domain";

/**
 * What the recordings library knows about one recording (wc10, WC-10).
 *
 * - `recording`: a tab is writing it right now (see `recordingHere`).
 * - `complete`: stopped normally.
 * - `stopped-early`: storage ran full; everything written before that is kept.
 * - `incomplete`: never finalised (the tab closed or crashed) or ended on an error. What
 *   was written is kept and plays up to where it stops.
 * - `unusable`: this attempt produced no playable clip. Any bytes remain on the device.
 * - `missing`: the library still lists it but its file is gone (cleared by the browser or
 *   the person). It can only be removed from the list.
 */
export type RecordingState =
  | "recording"
  | "complete"
  | "stopped-early"
  | "incomplete"
  | "unusable"
  | "missing";

export type StoredRecordingEndReason = "stopped" | "storage-full" | "failed" | "unusable";

export interface LocalRecording {
  /** The recording request id; it also names the file. */
  readonly id: RecordingRequestId;
  /** The meeting's room code when the recorder knew it. */
  readonly roomCode: string | null;
  /** The history session this recording is linked to, when there is one. */
  readonly meetingId: string | null;
  readonly meetingTitle: string | null;
  /** Milliseconds since the epoch. */
  readonly startedAt: number;
  /** Null while recording and for a recording that was never finalised. */
  readonly endedAt: number | null;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly state: RecordingState;
  /** True when this tab is the one writing it. */
  readonly recordingHere: boolean;
}

export type RecordingLibraryError =
  | { readonly code: "recordings-unavailable" }
  | { readonly code: "recording-file-missing" }
  | { readonly code: "recording-in-progress" }
  | { readonly code: "recordings-failed" };

export type RecordingChange =
  | { readonly kind: "changed"; readonly id: RecordingRequestId }
  | { readonly kind: "deleted"; readonly id: RecordingRequestId };

/** A recording opened for playback. `revoke` must be called when the player is done. */
export interface PlaybackSource {
  /** A `blob:` object URL backed by the OPFS file; nothing is copied or sent anywhere. */
  readonly url: string;
  readonly mimeType: string;
  readonly revoke: () => void;
}

export interface RecordingStorageInfo {
  readonly support: Support;
  /** Bytes the origin uses and may use, as the browser estimates; null when it will not say. */
  readonly usedBytes: number | null;
  readonly quotaBytes: number | null;
  /** True once `navigator.storage.persist()` was granted ("Keep recordings"). */
  readonly persisted: boolean;
}

/**
 * The recordings kept in this browser. Lists and reads never touch a network. Writes
 * happen only through `remove` here and through the recorder.
 */
export interface RecordingLibrary {
  readonly support: Support;
  /** Newest first. Recordings found only as files (no index row) are listed too. */
  list(signal?: AbortSignal): Promise<Result<readonly LocalRecording[], RecordingLibraryError>>;
  /** Null when the id is not kept. */
  get(id: RecordingRequestId): Promise<Result<LocalRecording | null, RecordingLibraryError>>;
  openPlayback(id: RecordingRequestId): Promise<Result<PlaybackSource, RecordingLibraryError>>;
  /** Deletes the file and its row. Refused while it is being recorded. Absent ids succeed. */
  remove(id: RecordingRequestId): Promise<Result<void, RecordingLibraryError>>;
  storage(): Promise<RecordingStorageInfo>;
  /** Asks the browser to keep this site's storage; call it from a click. */
  requestPersistence(): Promise<RecordingStorageInfo>;
  /** Hears changes made in this tab and in other tabs. */
  subscribe(listener: (change: RecordingChange) => void): () => void;
}

/** What the recorder writes to the index; neither call ever rejects or throws. */
export interface RecordingIndexWriter {
  begin(entry: {
    readonly id: RecordingRequestId;
    readonly roomCode: string | null;
    readonly fileName: string;
    readonly mimeType: string;
    readonly startedAt: number;
  }): Promise<void>;
  finish(entry: {
    readonly id: RecordingRequestId;
    readonly endedAt: number;
    readonly sizeBytes: number;
    readonly endReason: StoredRecordingEndReason;
  }): Promise<void>;
}
