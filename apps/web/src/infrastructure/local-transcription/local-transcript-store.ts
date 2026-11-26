import type {
  LocalTranscriptEntry,
  LocalTranscriptLine,
} from "../../presentation/guest-meeting/local-transcript-services";
import { adaptPglite, type HistoryDatabase } from "../history/history-database";

const MAX_ENTRIES = 100;
const MAX_LINES = 4_000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const FIELDS = 'e.id, e.label, e.saved_at AS "savedAt", e.incomplete';
const SEARCH_TOKENS = "'[^[:alnum:]]+'";
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS speech_entries(
    owner text NOT NULL, id text NOT NULL, label text NOT NULL, saved_at text NOT NULL,
    incomplete boolean NOT NULL, PRIMARY KEY(owner,id))`,
  `CREATE TABLE IF NOT EXISTS speech_lines(
    owner text NOT NULL, entry text NOT NULL, id integer NOT NULL, start_ms float8 NOT NULL,
    end_ms float8 NOT NULL, text text NOT NULL, gap boolean NOT NULL, speaker text,
    PRIMARY KEY(owner,entry,id), FOREIGN KEY(owner,entry) REFERENCES speech_entries(owner,id) ON DELETE CASCADE)`,
];

function validId(id: string): string {
  if (!UUID.test(id)) throw new Error("Invalid local transcript scope");
  return id;
}

interface TranscriptDatabase {
  readonly db: HistoryDatabase;
  readonly close: () => Promise<void>;
}

async function open(storage: "retained" | "memory"): Promise<TranscriptDatabase> {
  if (storage === "retained" && typeof indexedDB === "undefined") {
    throw new Error("Browser storage is unavailable");
  }
  const { PGliteWorker } = await import("@electric-sql/pglite/worker");
  const localWorker = new Worker(new URL("./local-transcript-worker.ts", import.meta.url), {
    name:
      storage === "retained" ? "know-meet-local-transcripts" : "know-meet-local-transcript-search",
    type: "module",
  });
  let live: Awaited<ReturnType<typeof PGliteWorker.create>> | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const storageUnavailable = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Transcript storage did not start")), 15_000);
    localWorker.addEventListener(
      "error",
      () => reject(new Error("Transcript storage did not start")),
      { once: true },
    );
  });
  try {
    // Live text belongs only to one requester and room scope. The unique worker
    // group prevents reuse of that in-memory database by another tab.
    const id = storage === "retained" ? "know-meet-local-transcripts-v1" : crypto.randomUUID();
    const opening = PGliteWorker.create(localWorker, { id, meta: { transcriptStorage: storage } });
    live = await Promise.race([opening, storageUnavailable]);
    const db = adaptPglite(live);
    if (storage === "retained") {
      await Promise.race([
        db.transaction(async (tx) => {
          for (const statement of SCHEMA) await tx.query(statement);
        }),
        storageUnavailable,
      ]);
    }
    const connection = live;
    return { db, close: () => connection.close() };
  } catch (error) {
    if (live !== null) void live.close().catch(() => undefined);
    localWorker.terminate();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function createLocalTranscriptStore() {
  let opening: Promise<TranscriptDatabase> | null = null;
  let liveOpening: Promise<TranscriptDatabase> | null = null;
  const retained = () => {
    if (opening === null) {
      const attempt = open("retained");
      opening = attempt;
      void attempt.catch(() => {
        if (opening === attempt) opening = null;
      });
    }
    return opening;
  };
  const get = async () => (await retained()).db;

  const readLines = async (owner: string, id: string, connection?: HistoryDatabase) => {
    const db = connection ?? (await get());
    const result = await db.query<LocalTranscriptLine>(
      `SELECT id, start_ms AS "startMs", end_ms AS "endMs", text, gap, speaker
       FROM speech_lines WHERE owner=$1 AND entry=$2
       ORDER BY start_ms,id LIMIT ${MAX_LINES}`,
      [validId(owner), validId(id)],
    );
    return result.rows;
  };

  const resetLiveSearch = () => {
    const prior = liveOpening;
    liveOpening = null;
    void prior?.then((connection) => connection.close()).catch(() => undefined);
  };

  return {
    resetLiveSearch,
    async searchLive(lines: readonly LocalTranscriptLine[], query: string) {
      const searchable = lines.filter((line) => !line.gap).map(({ id, text }) => ({ id, text }));
      if (searchable.length === 0) return [];
      liveOpening ??= open("memory");
      const attempt = liveOpening;
      try {
        const { db } = await attempt;
        if (liveOpening !== attempt) return [];
        const result = await db.query<{ readonly id: number }>(
          `/* kmt-live-lexical-search */
           SELECT line.id FROM jsonb_to_recordset($1::jsonb) AS line(id integer, text text)
           WHERE regexp_split_to_array(lower(line.text), ${SEARCH_TOKENS})
             @> array_remove(regexp_split_to_array(lower($2::text), ${SEARCH_TOKENS}), '')`,
          [JSON.stringify(searchable), query],
        );
        return liveOpening === attempt ? result.rows.map(({ id }) => id) : [];
      } catch (error) {
        if (liveOpening === attempt) resetLiveSearch();
        throw error;
      }
    },
    async searchSaved(owner: string, id: string, query: string) {
      const db = await get();
      const result = await db.query<{ readonly id: number }>(
        `/* kmt-retained-lexical-search */
         SELECT id FROM speech_lines WHERE owner=$1 AND entry=$2 AND NOT gap
           AND regexp_split_to_array(lower(text), ${SEARCH_TOKENS})
             @> array_remove(regexp_split_to_array(lower($3::text), ${SEARCH_TOKENS}), '')`,
        [validId(owner), validId(id), query],
      );
      return result.rows.map(({ id }) => id);
    },
    async list(owner: string): Promise<readonly LocalTranscriptEntry[]> {
      const db = await get();
      return (
        await db.query<LocalTranscriptEntry>(
          `SELECT ${FIELDS} FROM speech_entries e WHERE e.owner=$1
         ORDER BY e.saved_at DESC,e.id LIMIT ${MAX_ENTRIES}`,
          [validId(owner)],
        )
      ).rows;
    },
    readLines,
    async save(owner: string, entry: LocalTranscriptEntry, lines: readonly LocalTranscriptLine[]) {
      const id = validId(entry.id);
      validId(owner);
      if (lines.length === 0 || lines.length > MAX_LINES || entry.label.length > 120) {
        throw new Error("Transcript cannot be kept on this device");
      }
      const attempt = retained();
      const connection = await attempt;
      const { db } = connection;
      try {
        await db.transaction(async (tx) => {
          const existing =
            (
              await tx.query<{ readonly exists: boolean }>(
                "SELECT EXISTS(SELECT 1 FROM speech_entries WHERE owner=$1 AND id=$2) AS exists",
                [owner, id],
              )
            ).rows[0]?.exists === true;
          if (!existing) {
            const count = (
              await tx.query<{ readonly count: number }>(
                "SELECT count(*)::integer AS count FROM speech_entries WHERE owner=$1",
                [owner],
              )
            ).rows[0]?.count;
            if (typeof count !== "number" || count >= MAX_ENTRIES) {
              throw new Error("Remove an older transcript before saving another");
            }
          }
          await tx.query(
            `INSERT INTO speech_entries(owner,id,label,saved_at,incomplete) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (owner,id) DO UPDATE SET label=EXCLUDED.label,
             saved_at=EXCLUDED.saved_at,incomplete=EXCLUDED.incomplete`,
            [owner, id, entry.label, entry.savedAt, entry.incomplete],
          );
          await tx.query("DELETE FROM speech_lines WHERE owner=$1 AND entry=$2", [owner, id]);
          await tx.query(
            `INSERT INTO speech_lines(owner,entry,id,start_ms,end_ms,text,gap,speaker)
             SELECT $1,$2,x.id,x."startMs",x."endMs",x.text,x.gap,x.speaker
             FROM jsonb_to_recordset($3::jsonb)
             AS x(id integer,"startMs" float8,"endMs" float8,text text,gap boolean,speaker text)`,
            [owner, id, JSON.stringify(lines)],
          );
        });
        const written = (
          await db.query<LocalTranscriptEntry>(
            `SELECT ${FIELDS} FROM speech_entries e WHERE e.owner=$1 AND e.id=$2`,
            [owner, id],
          )
        ).rows[0];
        if (
          written?.label !== entry.label ||
          written.savedAt !== entry.savedAt ||
          written.incomplete !== entry.incomplete
        )
          throw new Error("Transcript entry could not be verified");
        const actual = await readLines(owner, id, db);
        const expected = [...lines].sort((a, b) => a.startMs - b.startMs || a.id - b.id);
        if (
          actual.length !== expected.length ||
          actual.some((a, i) => {
            const e = expected[i];
            return (
              e === undefined ||
              a.id !== e.id ||
              a.startMs !== e.startMs ||
              a.endMs !== e.endMs ||
              a.text !== e.text ||
              a.gap !== e.gap ||
              a.speaker !== e.speaker
            );
          })
        )
          throw new Error("Transcript save could not be verified");
      } catch (error) {
        // The IndexedDB flush can fail after PostgreSQL has already committed.
        // Retire the in-memory connection before another operation can flush it.
        if (opening === attempt) opening = null;
        await connection.close();
        throw error;
      }
    },
    async remove(owner: string, id: string) {
      validId(owner);
      validId(id);
      const db = await get();
      await db.transaction(async (tx) => {
        await tx.query("DELETE FROM speech_entries WHERE owner=$1 AND id=$2", [owner, id]);
      });
      if (
        (await readLines(owner, id)).length > 0 ||
        (await db.query("SELECT id FROM speech_entries WHERE owner=$1 AND id=$2", [owner, id])).rows
          .length > 0
      ) {
        throw new Error("Transcript removal could not be verified");
      }
    },
  };
}
