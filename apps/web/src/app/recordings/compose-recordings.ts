// TJ-ARCH-MOB-001 compliant
import { readStoragePersisted, requestStoragePersistence } from "../../infrastructure/history";
import {
  type CompositeRecorder,
  createCompositeRecorder,
  createRecordingChangeBus,
  createRecordingIndex,
  createRecordingLibrary,
} from "../../infrastructure/recording";
import type { HistoryServices } from "../history/history-services";
import type { RecordingsServices } from "./recordings-services";

/**
 * Local recordings (wc10): files in OPFS, their index in the local history database.
 * Nothing opens until the first read or recording, so a tab that never records or opens
 * the library never loads the database or touches the file system. Composed once.
 */
export function composeRecordings(history: HistoryServices): RecordingsServices {
  const changes = createRecordingChangeBus();
  const index = createRecordingIndex({ openDatabase: history.openDatabase, changes });
  let recorder: CompositeRecorder | null = null;
  const library = createRecordingLibrary({
    index,
    changes,
    localActiveId: () => recorder?.activeRequestId() ?? null,
    isPersisted: readStoragePersisted,
    requestPersistence: requestStoragePersistence,
  });
  return {
    library,
    createRecorder: (room, roomCode) => {
      recorder = createCompositeRecorder({ room, index, roomCode });
      return recorder;
    },
  };
}
