// TJ-ARCH-MOB-001 compliant
import { parseRecordingRequestId, type RecordingRequestId } from "@know-meet/domain";
import type { HistoryDatabase } from "../../history/history-database";
import { migrateHistory } from "../../history/history-schema";
import type { RecordingIndexWriter, StoredRecordingEndReason } from "../library-types";
import type { RecordingChangeBus } from "./recording-change-bus";

/** One row of the `recording` table, as the library reads it. */
export interface IndexedRecording {
  readonly id: RecordingRequestId;
  readonly roomCode: string | null;
  readonly fileName: string;
  readonly mimeType: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly sizeBytes: number;
  readonly endReason: StoredRecordingEndReason | null;
}

/** The history session a recording is linked to. */
export interface RecordingMeetingLink {
  readonly meetingId: string;
  readonly title: string | null;
  readonly roomCode: string;
}

export interface RecordingIndex extends RecordingIndexWriter {
  /** Null when the browser cannot keep the index (no IndexedDB, private window). */
  rows(): Promise<readonly IndexedRecording[] | null>;
  links(): Promise<ReadonlyMap<string, RecordingMeetingLink>>;
  remove(id: RecordingRequestId): Promise<boolean>;
}

interface IndexRow {
  readonly id: string;
  readonly room_code: string | null;
  readonly file_name: string;
  readonly mime_type: string;
  readonly started_at: unknown;
  readonly ended_at: unknown;
  readonly size_bytes: unknown;
  readonly end_reason: string | null;
}

interface LinkRow {
  readonly recording_id: string;
  readonly meeting_id: string;
  readonly title: string | null;
  readonly room_code: string;
}

/** bigint columns arrive as numbers or strings depending on the driver path. */
function toNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toEndReason(value: string | null): IndexedRecording["endReason"] {
  return value === "stopped" ||
    value === "storage-full" ||
    value === "failed" ||
    value === "unusable"
    ? value
    : null;
}

function toIndexed(row: IndexRow): IndexedRecording | null {
  const id = parseRecordingRequestId(row.id);
  const startedAt = toNumber(row.started_at);
  if (id === null || startedAt === null) return null;
  return {
    id,
    roomCode: row.room_code,
    fileName: row.file_name,
    mimeType: row.mime_type,
    startedAt,
    endedAt: row.ended_at === null ? null : toNumber(row.ended_at),
    sizeBytes: toNumber(row.size_bytes) ?? 0,
    endReason: toEndReason(row.end_reason),
  };
}

export interface RecordingIndexOptions {
  /** The shared history database (the same worker group as history). */
  readonly openDatabase: () => Promise<HistoryDatabase>;
  readonly changes: RecordingChangeBus;
}

/**
 * The recording index over the history database (wc10 task 10.2). It lives there, not in
 * OPFS metadata, because the history store is already shared by every tab through one
 * leader worker, is transactional, and already holds the link from a meeting to its
 * recordings, so one query lists a recording with its meeting. Nothing depends on it for
 * the recording itself: if the index cannot be opened, the recorder still writes the file
 * and the library finds it by listing OPFS.
 */
export function createRecordingIndex(options: RecordingIndexOptions): RecordingIndex {
  let opening: Promise<HistoryDatabase | null> | null = null;

  /** Null when the database cannot open. A failed open is tried again next time. */
  const database = (): Promise<HistoryDatabase | null> => {
    if (opening === null) {
      const attempt = options
        .openDatabase()
        .then(async (db) => {
          await migrateHistory(db);
          return db;
        })
        .catch((): null => null);
      opening = attempt;
      void attempt.then((db) => {
        if (db === null && opening === attempt) opening = null;
      });
    }
    return opening;
  };

  return {
    begin: async (entry) => {
      try {
        const db = await database();
        if (db === null) return;
        await db.query(
          `INSERT INTO recording (id, room_code, file_name, mime_type, started_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [entry.id, entry.roomCode, entry.fileName, entry.mimeType, entry.startedAt],
        );
        options.changes.publish({ kind: "changed", id: entry.id });
      } catch {
        // The file is still written; the library finds it by listing the directory.
      }
    },
    finish: async (entry) => {
      try {
        const db = await database();
        if (db === null) return;
        await db.query(
          `UPDATE recording SET ended_at = $2, size_bytes = $3, end_reason = $4 WHERE id = $1`,
          [entry.id, entry.endedAt, entry.sizeBytes, entry.endReason],
        );
        options.changes.publish({ kind: "changed", id: entry.id });
      } catch {
        // The row stays open: the library lists it as incomplete, with the file's real size.
      }
    },
    rows: async () => {
      try {
        const db = await database();
        if (db === null) return null;
        const result = await db.query<IndexRow>(
          "SELECT * FROM recording ORDER BY started_at DESC, id DESC",
        );
        return result.rows.map(toIndexed).filter((row) => row !== null);
      } catch {
        return null;
      }
    },
    links: async () => {
      const links = new Map<string, RecordingMeetingLink>();
      try {
        const db = await database();
        if (db === null) return links;
        const result = await db.query<LinkRow>(
          `SELECT DISTINCT ON (l.recording_id)
                  l.recording_id, l.meeting_id, s.title, s.room_code
             FROM meeting_recording_link l
             JOIN meeting_session s ON s.id = l.meeting_id
            ORDER BY l.recording_id, l.linked_at`,
        );
        for (const row of result.rows) {
          links.set(row.recording_id, {
            meetingId: row.meeting_id,
            title: row.title,
            roomCode: row.room_code,
          });
        }
      } catch {
        // Without links a recording lists without its meeting; it is still listed.
      }
      return links;
    },
    remove: async (id) => {
      try {
        const db = await database();
        if (db === null) return true;
        await db.query("DELETE FROM recording WHERE id = $1", [id]);
        return true;
      } catch {
        return false;
      }
    },
  };
}
