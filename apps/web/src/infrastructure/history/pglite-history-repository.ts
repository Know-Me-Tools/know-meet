// TJ-ARCH-MOB-001 compliant
import type {
  HistoryRepository,
  HistoryWriteError,
  MeetingDetail,
  MeetingListQuery,
  MeetingPage,
} from "@know-meet/application";
import {
  type ChatMessageId,
  err,
  type HistoryChatMessage,
  type HistoryEntryNotFound,
  type HistoryStorageError,
  type HistoryStorageStatus,
  historyErrors,
  type MeetingHistoryId,
  type MeetingSession,
  ok,
  type RecordingRequestId,
  type Result,
} from "@know-meet/domain";
import type { HistoryChangeBus } from "./history-change-bus";
import { cursorFor, readCursor } from "./history-cursor";
import type { HistoryDatabase, SqlRunner } from "./history-database";
import {
  type ChatRow,
  chatInsertParams,
  type SessionRow,
  SUMMARY_SELECT,
  toHistoryChatMessageRow,
  toMeetingSummary,
  toNumber,
} from "./history-rows";
import { migrateHistory } from "./history-schema";

export interface PgliteHistoryRepositoryOptions {
  /** Opens the shared database (the leader worker client in the browser). */
  readonly openDatabase: () => Promise<HistoryDatabase>;
  /** Cross-tab change fan-out. */
  readonly changes: HistoryChangeBus;
  /** `navigator.storage.persisted()` in the browser. */
  readonly isPersisted: () => Promise<boolean>;
}

const MAX_PAGE_SIZE = 200;

const NEWEST_FIRST_PAGE = `${SUMMARY_SELECT}
  WHERE ($1::bigint IS NULL
         OR s.joined_at < $1::bigint
         OR (s.joined_at = $1::bigint AND s.id < $2::text))
  ORDER BY s.joined_at DESC, s.id DESC
  LIMIT $3`;

const ONE_SUMMARY = `${SUMMARY_SELECT} WHERE s.id = $1`;

const INSERT_CHAT = `INSERT INTO chat_message
    (meeting_id, id, direction, from_identity, from_name, audience_kind,
     audience_to, audience_to_name, text, sent_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT (meeting_id, id) DO NOTHING
  RETURNING id`;

function participantsJson(session: MeetingSession): string {
  return JSON.stringify(
    session.participants.map((person) => ({ identity: person.identity, name: person.name })),
  );
}

async function meetingExists(tx: SqlRunner, id: MeetingHistoryId): Promise<boolean> {
  const found = await tx.query<{ id: string }>("SELECT id FROM meeting_session WHERE id = $1", [
    id,
  ]);
  return found.rows.length > 0;
}

/**
 * One write statement, run as a transaction so `adaptPglite` flushes it to IndexedDB before
 * it resolves. A bare `query` stays in memory until a later statement, so the last write of a
 * session, its end time, was lost on a reload (WC-7 hosted, evidence/wc7-diag-2026-11-21).
 */
function writeOne<T>(
  db: HistoryDatabase,
  sql: string,
  params?: readonly unknown[],
): Promise<{ readonly rows: T[] }> {
  return db.transaction((tx) => tx.query<T>(sql, params));
}

/**
 * The `HistoryRepository` over PGlite on `idb://` (wc09 task 9.2). It talks to the
 * database only through `HistoryDatabase`, opens it on first use, and never touches the
 * network. See `ports.ts` for the contract this implements.
 */
export function createPgliteHistoryRepository(
  options: PgliteHistoryRepositoryOptions,
): HistoryRepository {
  const { changes } = options;
  let opening: Promise<HistoryDatabase | null> | null = null;

  /** Null when the browser cannot keep history. A failed open is tried again next time. */
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

  /**
   * Runs `work` against the database. A fired `signal` rejects with its reason (abort is
   * not a storage failure); any other throw is `history-storage-failed`.
   */
  const run = async <T>(
    signal: AbortSignal | undefined,
    work: (db: HistoryDatabase) => Promise<T>,
  ): Promise<Result<T, HistoryStorageError>> => {
    signal?.throwIfAborted();
    const db = await database();
    if (db === null) return err(historyErrors.unavailable());
    try {
      const value = await work(db);
      signal?.throwIfAborted();
      return ok(value);
    } catch (error) {
      if (signal?.aborted === true) throw signal.reason;
      // WC-7: the result carries only the code, so the cause is logged here or nowhere.
      // biome-ignore lint/suspicious/noConsole: WC-7 diagnostic, the only record of why history stopped
      console.error("[know-meet] history storage failed", error);
      return err(historyErrors.storageFailed());
    }
  };

  /** A write whose `work` can also report that the meeting is not kept. */
  const runWrite = async <T>(
    work: (db: HistoryDatabase) => Promise<Result<T, HistoryEntryNotFound>>,
  ): Promise<Result<T, HistoryWriteError>> => {
    const outcome = await run(undefined, work);
    return outcome.ok ? outcome.value : outcome;
  };

  const listMeetings = (query: MeetingListQuery) =>
    run(query.signal, async (db): Promise<MeetingPage> => {
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.limit)));
      const position = query.cursor === null ? null : readCursor(query.cursor);
      if (query.cursor !== null && position === null) throw new Error("Unreadable cursor");
      return db.transaction(async (tx) => {
        const page = await tx.query<SessionRow>(NEWEST_FIRST_PAGE, [
          position?.joinedAt ?? null,
          position?.id ?? null,
          limit + 1,
        ]);
        const total = await tx.query<{ total: unknown }>(
          "SELECT count(*) AS total FROM meeting_session",
        );
        const summaries = page.rows.map(toMeetingSummary).filter((m) => m !== null);
        const shown = summaries.slice(0, limit);
        const last = shown.at(-1);
        const hasMore = page.rows.length > limit && last !== undefined;
        return {
          meetings: shown,
          nextCursor: hasMore ? cursorFor(last.joinedAt, last.id) : null,
          total: toNumber(total.rows[0]?.total) ?? shown.length,
        };
      });
    });

  const getMeeting = (id: MeetingHistoryId, signal?: AbortSignal) =>
    run(
      signal,
      (db): Promise<MeetingDetail | null> =>
        db.transaction(async (tx) => {
          const found = await tx.query<SessionRow>(ONE_SUMMARY, [id]);
          const row = found.rows[0];
          const meeting = row === undefined ? null : toMeetingSummary(row);
          if (meeting === null) return null;
          const chat = await tx.query<ChatRow>(
            "SELECT * FROM chat_message WHERE meeting_id = $1 ORDER BY sent_at, id",
            [id],
          );
          const parsed = chat.rows.map(toHistoryChatMessageRow).filter((m) => m !== null);
          if (parsed.length !== chat.rows.length) {
            // WC-7: an unreadable stored row would otherwise vanish from the detail silently.
            // biome-ignore lint/suspicious/noConsole: WC-7 diagnostic, the only record of why history stopped
            console.error(
              "[know-meet] history chat rows unreadable",
              chat.rows.length - parsed.length,
            );
          }
          return { meeting, chat: parsed };
        }),
    );

  const createMeeting = async (session: MeetingSession) => {
    const outcome = await run(undefined, async (db) => {
      const inserted = await writeOne<{ id: string }>(
        db,
        `INSERT INTO meeting_session
           (id, room_code, title, joined_at, left_at, end_reason, participants)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          session.id,
          session.roomCode,
          session.title,
          session.joinedAt,
          session.leftAt,
          session.endReason,
          participantsJson(session),
        ],
      );
      return inserted.rows.length > 0;
    });
    if (!outcome.ok) return outcome;
    if (outcome.value) changes.publish({ kind: "meeting-changed", meetingId: session.id });
    return ok(undefined);
  };

  const updateMeeting = async (session: MeetingSession) => {
    const outcome = await runWrite(async (db) => {
      const updated = await writeOne<{ id: string }>(
        db,
        `UPDATE meeting_session
           SET title = $2, left_at = $3, end_reason = $4, participants = $5::jsonb
         WHERE id = $1
         RETURNING id`,
        [session.id, session.title, session.leftAt, session.endReason, participantsJson(session)],
      );
      return updated.rows.length > 0 ? ok(undefined) : err(historyErrors.entryNotFound());
    });
    if (outcome.ok) changes.publish({ kind: "meeting-changed", meetingId: session.id });
    return outcome;
  };

  const appendChat = async (
    meetingId: MeetingHistoryId,
    messages: readonly HistoryChatMessage[],
  ) => {
    const outcome = await runWrite((db) =>
      db.transaction(async (tx) => {
        if (!(await meetingExists(tx, meetingId))) return err(historyErrors.entryNotFound());
        const kept: ChatMessageId[] = [];
        for (const message of messages) {
          if (message.meetingId !== meetingId) continue;
          const inserted = await tx.query<{ id: string }>(INSERT_CHAT, chatInsertParams(message));
          if (inserted.rows.length > 0) kept.push(message.id);
        }
        return ok(kept);
      }),
    );
    if (!outcome.ok) return outcome;
    if (outcome.value.length > 0) {
      changes.publish({ kind: "chat-appended", meetingId, messageIds: outcome.value });
      changes.publish({ kind: "meeting-changed", meetingId });
    }
    return ok(undefined);
  };

  const linkRecording = async (meetingId: MeetingHistoryId, recordingId: RecordingRequestId) => {
    const outcome = await runWrite((db) =>
      db.transaction(async (tx) => {
        if (!(await meetingExists(tx, meetingId))) return err(historyErrors.entryNotFound());
        const linked = await tx.query<{ recording_id: string }>(
          `INSERT INTO meeting_recording_link (meeting_id, recording_id, linked_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (meeting_id, recording_id) DO NOTHING
           RETURNING recording_id`,
          [meetingId, recordingId, Date.now()],
        );
        return ok(linked.rows.length > 0);
      }),
    );
    if (!outcome.ok) return outcome;
    if (outcome.value) changes.publish({ kind: "meeting-changed", meetingId });
    return ok(undefined);
  };

  const deleteMeeting = async (id: MeetingHistoryId) => {
    const outcome = await run(undefined, async (db) => {
      const removed = await writeOne<{ id: string }>(
        db,
        "DELETE FROM meeting_session WHERE id = $1 RETURNING id",
        [id],
      );
      return removed.rows.length > 0;
    });
    if (!outcome.ok) return outcome;
    if (outcome.value) changes.publish({ kind: "meeting-deleted", meetingId: id });
    return ok(undefined);
  };

  const deleteAll = async () => {
    const outcome = await run(undefined, (db) => writeOne(db, "DELETE FROM meeting_session"));
    if (!outcome.ok) return outcome;
    changes.publish({ kind: "cleared" });
    return ok(undefined);
  };

  const status = async (): Promise<HistoryStorageStatus> => {
    if ((await database()) === null) return "blocked";
    return (await options.isPersisted()) ? "persistent" : "non-persistent";
  };

  return {
    status,
    listMeetings,
    getMeeting,
    createMeeting,
    updateMeeting,
    appendChat,
    linkRecording,
    deleteMeeting,
    deleteAll,
    subscribe: (listener) => changes.subscribe(listener),
  };
}
