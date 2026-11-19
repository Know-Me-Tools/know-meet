// TJ-ARCH-MOB-001 compliant
import type { RealtimeRoom } from "@know-meet/application";
import type { CompositeRecorder, RecordingLibrary } from "../../infrastructure/recording";

/**
 * The recordings kept in this browser, as the app shell hands them to hooks. Screens read
 * and delete through the hooks in `./hooks`, never through the library directly.
 */
export interface RecordingsServices {
  readonly library: RecordingLibrary;
  /**
   * Builds the local recorder for one meeting room. `roomCode` is read when a recording
   * starts. Call it once per page: the library asks the latest recorder what it is writing.
   */
  readonly createRecorder: (room: RealtimeRoom, roomCode: () => string | null) => CompositeRecorder;
}
