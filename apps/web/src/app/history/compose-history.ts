// TJ-ARCH-MOB-001 compliant
import {
  createHistoryChangeBus,
  createPgliteHistoryRepository,
  openHistoryDatabase,
  readStoragePersisted,
  requestStoragePersistence,
} from "../../infrastructure/history";
import type { HistoryDatabase } from "../../infrastructure/history/history-database";
import type { HistoryServices } from "./history-services";

/**
 * Local history over PGlite: nothing opens until the first read or write, so a tab that
 * never joins a meeting or opens the history screen never loads the database. Composed
 * once; a second call would start a second change bus for the same store.
 */
export function composeHistory(): HistoryServices {
  // One worker client for the whole tab: the recordings index shares it (wc10).
  let opening: Promise<HistoryDatabase> | null = null;
  const openDatabase = (): Promise<HistoryDatabase> => {
    if (opening === null) {
      const attempt = openHistoryDatabase();
      opening = attempt;
      // A failed open is tried again on the next call.
      attempt.catch(() => {
        if (opening === attempt) opening = null;
      });
    }
    return opening;
  };
  const repository = createPgliteHistoryRepository({
    openDatabase,
    changes: createHistoryChangeBus(),
    isPersisted: readStoragePersisted,
  });
  return {
    repository,
    openDatabase,
    requestPersistence: async () => {
      await requestStoragePersistence();
      return repository.status();
    },
  };
}
