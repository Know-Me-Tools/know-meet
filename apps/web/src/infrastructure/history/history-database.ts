// TJ-ARCH-MOB-001 compliant

/** One statement runner: the same shape for the database and for a transaction. */
export interface SqlRunner {
  query<T>(sql: string, params?: readonly unknown[]): Promise<{ readonly rows: T[] }>;
}

/**
 * The slice of PGlite the history repository uses. The repository depends on this, not on
 * PGlite, so the adapter can run against an in-memory PGlite in tests and the worker
 * client in the browser.
 */
export interface HistoryDatabase extends SqlRunner {
  transaction<T>(work: (tx: SqlRunner) => Promise<T>): Promise<T>;
}

/** The structural part of PGlite (and PGliteWorker) that `adaptPglite` needs. */
interface PgliteLike {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(work: (tx: PgliteLikeTransaction) => Promise<T>): Promise<T>;
  /** Writes committed data to the IndexedDB data directory now. */
  syncToFs(): Promise<void>;
}

interface PgliteLikeTransaction {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

function runner(source: PgliteLikeTransaction): SqlRunner {
  return {
    query: (sql, params) => source.query(sql, params === undefined ? undefined : [...params]),
  };
}

/**
 * Wraps a PGlite or PGliteWorker instance as a `HistoryDatabase`.
 *
 * PGlite 0.5.16 flushes to IndexedDB after BEGIN but not after COMMIT, so a committed
 * transaction stays in memory until the next statement, and a reload loses it (WC-7,
 * evidence/wc7-investigation-2026-11-20). Each transaction is therefore flushed before it
 * resolves.
 */
export function adaptPglite(db: PgliteLike): HistoryDatabase {
  return {
    ...runner(db),
    transaction: async (work) => {
      const result = await db.transaction((tx) => work(runner(tx)));
      await db.syncToFs();
      return result;
    },
  };
}
