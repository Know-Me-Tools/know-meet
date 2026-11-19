// TJ-ARCH-MOB-001 compliant
import type { RecordingStorageInfo } from "../recording";

/** Entity type names the recording transports register under. */
export const RECORDING_ENTITY = "LocalRecording";
export const RECORDING_STORAGE_ENTITY = "RecordingStorage";

/** The one row of the RecordingStorage entity. */
export const RECORDING_STORAGE_ROW_ID = "storage";

/** What the browser says about the space recordings may use and whether it will keep them. */
export interface RecordingStorageRow extends RecordingStorageInfo {
  readonly id: typeof RECORDING_STORAGE_ROW_ID;
}
