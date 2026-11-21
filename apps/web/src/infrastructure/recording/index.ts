// TJ-ARCH-MOB-001 compliant
export { type CompositeRecorder, createCompositeRecorder } from "./composite-recorder";
export type {
  LocalRecording,
  PlaybackSource,
  RecordingChange,
  RecordingIndexWriter,
  RecordingLibrary,
  RecordingLibraryError,
  RecordingState,
  RecordingStorageInfo,
} from "./library-types";
export { createRecordingLibrary } from "./recording-library";
export { createRecordingChangeBus, type RecordingChangeBus } from "./store/recording-change-bus";
export { createRecordingIndex, type RecordingIndex } from "./store/recording-index";
