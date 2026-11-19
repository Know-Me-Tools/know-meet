/**
 * Whether this browser can keep history, as the history screen reports it.
 *
 * - `persistent`: stored, and the browser granted persistent storage.
 * - `non-persistent`: stored, but the browser may clear it under storage pressure
 *   (`navigator.storage.persisted()` is false); the notice says so.
 * - `blocked`: nothing can be stored, for example IndexedDB refused in a private window.
 *   Meetings still work; nothing is saved.
 */
export type HistoryStorageStatus = "persistent" | "non-persistent" | "blocked";

/** The browser refused local storage (status `blocked`). Nothing was read or written. */
export interface HistoryUnavailable {
  readonly code: "history-unavailable";
}

/**
 * The store was there but the operation did not complete: quota exceeded, the storage
 * worker crashed, or another tab held the store too long. Nothing partial was kept.
 */
export interface HistoryStorageFailed {
  readonly code: "history-storage-failed";
}

/** The meeting session is not in this browser's history: deleted, or never kept. */
export interface HistoryEntryNotFound {
  readonly code: "history-entry-not-found";
}

/** Failures every history operation can have. */
export type HistoryStorageError = HistoryUnavailable | HistoryStorageFailed;

export type HistoryError = HistoryStorageError | HistoryEntryNotFound;

export const historyErrors = {
  unavailable: (): HistoryUnavailable => ({ code: "history-unavailable" }),
  storageFailed: (): HistoryStorageFailed => ({ code: "history-storage-failed" }),
  entryNotFound: (): HistoryEntryNotFound => ({ code: "history-entry-not-found" }),
} as const;
