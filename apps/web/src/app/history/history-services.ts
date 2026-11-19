// TJ-ARCH-MOB-001 compliant
import type { HistoryRepository } from "@know-meet/application";
import type { HistoryStorageStatus } from "@know-meet/domain";
import type { HistoryDatabase } from "../../infrastructure/history/history-database";

/**
 * Local history as the app shell hands it to hooks. The repository is the port; screens
 * read and delete through the entity hooks in `./hooks`, never through it directly.
 */
export interface HistoryServices {
  readonly repository: HistoryRepository;
  /**
   * The shared local database, opened once per tab. For the recordings index (wc10) only;
   * history reads and writes go through `repository`. Rejects where the browser blocks it.
   */
  readonly openDatabase: () => Promise<HistoryDatabase>;
  /**
   * Asks the browser to keep this site's storage (`navigator.storage.persist()`) and
   * returns the status afterwards. Call it from a user action.
   */
  readonly requestPersistence: () => Promise<HistoryStorageStatus>;
}
