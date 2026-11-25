// TJ-ARCH-MOB-001 compliant
import type { HistoryDatabase } from "./history-database";

/**
 * Local history schema (wc09 task 9.2). One migration per array entry, each a list of
 * single statements (PGlite runs one statement per `query`). Append; never edit a
 * released entry. A newer app in another tab may have raised the stored version: this
 * code then leaves it alone and never downgrades.
 *
 * - chat_message and meeting_recording_link cascade from meeting_session, so deleting a
 *   meeting removes its chat and links in the same statement.
 * - meeting_recording_link has no foreign key to a recordings table on purpose: the link
 *   is written before the wc10 recording row exists, and deleting a meeting must never
 *   delete a recording.
 * - Timestamps are epoch milliseconds in bigint.
 */
const MIGRATIONS: readonly (readonly string[])[] = [
  [
    `CREATE TABLE IF NOT EXISTS meeting_session (
       id text PRIMARY KEY,
       room_code text NOT NULL,
       title text,
       joined_at bigint NOT NULL,
       left_at bigint,
       end_reason text CHECK (end_reason IN ('left', 'connection-lost')),
       participants jsonb NOT NULL DEFAULT '[]'::jsonb
     )`,
    `CREATE INDEX IF NOT EXISTS meeting_session_newest_first
       ON meeting_session (joined_at DESC, id DESC)`,
    `CREATE TABLE IF NOT EXISTS chat_message (
       meeting_id text NOT NULL REFERENCES meeting_session (id) ON DELETE CASCADE,
       id text NOT NULL,
       direction text NOT NULL CHECK (direction IN ('sent', 'received')),
       from_identity text NOT NULL,
       from_name text NOT NULL,
       audience_kind text NOT NULL CHECK (audience_kind IN ('everyone', 'private')),
       audience_to text,
       audience_to_name text,
       text text NOT NULL,
       sent_at bigint NOT NULL,
       PRIMARY KEY (meeting_id, id)
     )`,
    `CREATE INDEX IF NOT EXISTS chat_message_oldest_first
       ON chat_message (meeting_id, sent_at, id)`,
    `CREATE TABLE IF NOT EXISTS meeting_recording_link (
       meeting_id text NOT NULL REFERENCES meeting_session (id) ON DELETE CASCADE,
       recording_id text NOT NULL,
       linked_at bigint NOT NULL,
       PRIMARY KEY (meeting_id, recording_id)
     )`,
  ],
  // wc10 (10.2): the index of local recordings. The files themselves live in OPFS; this
  // table holds what the file cannot say. `end_reason` is null while a recording is open
  // and stays null for one that was never finalised (a closed tab): the library shows
  // that as incomplete after checking that no tab still holds the recording's lock.
  [
    `CREATE TABLE IF NOT EXISTS recording (
       id text PRIMARY KEY,
       room_code text,
       file_name text NOT NULL,
       mime_type text NOT NULL,
       started_at bigint NOT NULL,
       ended_at bigint,
       size_bytes bigint NOT NULL DEFAULT 0,
       end_reason text CHECK (end_reason IN ('stopped', 'storage-full', 'failed'))
     )`,
    `CREATE INDEX IF NOT EXISTS recording_newest_first
       ON recording (started_at DESC, id DESC)`,
  ],
  [
    "ALTER TABLE recording DROP CONSTRAINT IF EXISTS recording_end_reason_check",
    `ALTER TABLE recording ADD CONSTRAINT recording_end_reason_check
       CHECK (end_reason IN ('stopped', 'storage-full', 'failed', 'unusable'))`,
  ],
];

const VERSION_KEY = "schema_version";

/** Brings the store to the latest schema. Idempotent; safe when several tabs call it. */
export async function migrateHistory(db: HistoryDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query(
      "CREATE TABLE IF NOT EXISTS history_meta (key text PRIMARY KEY, value text NOT NULL)",
    );
    const stored = await tx.query<{ value: string }>(
      "SELECT value FROM history_meta WHERE key = $1",
      [VERSION_KEY],
    );
    const before = Number(stored.rows[0]?.value ?? 0);
    let version = Number.isFinite(before) ? before : 0;
    for (const [index, statements] of MIGRATIONS.entries()) {
      if (index + 1 <= version) continue;
      for (const statement of statements) await tx.query(statement);
      version = index + 1;
    }
    if (version === before) return;
    await tx.query(
      `INSERT INTO history_meta (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [VERSION_KEY, String(version)],
    );
  });
}
