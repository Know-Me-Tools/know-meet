// TJ-ARCH-MOB-001 compliant
import { HISTORY_WORKER_GROUP } from "./history-constants";
import { adaptPglite, type HistoryDatabase } from "./history-database";

/**
 * Opens the shared history database from this tab: starts the history worker and joins
 * its leader group. Rejects when the browser cannot keep history (no Worker or
 * IndexedDB, IndexedDB refused in a private window, the worker or its WASM failed to
 * start); the repository reports that as `blocked`.
 *
 * PGlite loads lazily: it stays out of the entry chunk and is fetched on first use.
 */
export async function openHistoryDatabase(): Promise<HistoryDatabase> {
  if (typeof Worker === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("This browser cannot keep local history");
  }
  const { PGliteWorker } = await import("@electric-sql/pglite/worker");
  const historyWorker = new Worker(new URL("./history-worker.ts", import.meta.url), {
    type: "module",
    name: "know-meet-history",
  });
  try {
    const db = await PGliteWorker.create(historyWorker, { id: HISTORY_WORKER_GROUP });
    return adaptPglite(db);
  } catch (error) {
    historyWorker.terminate();
    throw error;
  }
}
