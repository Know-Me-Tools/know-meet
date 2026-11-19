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
}

interface PgliteLikeTransaction {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

function runner(source: PgliteLikeTransaction): SqlRunner {
  return {
    query: (sql, params) => source.query(sql, params === undefined ? undefined : [...params]),
  };
}

/** Wraps a PGlite or PGliteWorker instance as a `HistoryDatabase`. */
export function adaptPglite(db: PgliteLike): HistoryDatabase {
  return {
    ...runner(db),
    transaction: (work) => db.transaction((tx) => work(runner(tx))),
  };
}
