// TJ-ARCH-MOB-001 compliant

/** The IndexedDB-backed PGlite data directory. One per origin: every tab shares it. */
export const HISTORY_DATA_DIR = "idb://know-meet-history";

/** PGliteWorker group id: tabs with the same id elect one leader worker that owns the store. */
export const HISTORY_WORKER_GROUP = "know-meet-history";

/** BroadcastChannel that tells other tabs what changed (ids only, never history text). */
export const HISTORY_CHANNEL_NAME = "know-meet-history-changes";
