import {
  type ChatMessageId,
  err,
  type HistoryChatMessage,
  type HistoryStorageError,
  type HistoryStorageStatus,
  historyErrors,
  type MeetingHistoryId,
  type MeetingSession,
  type MeetingSummary,
  ok,
  type RecordingRequestId,
  type Result,
} from "@know-meet/domain";
import {
  type HistoryChange,
  type HistoryRepository,
  type HistoryWriteError,
  type MeetingCursor,
  type MeetingDetail,
  type MeetingListQuery,
  type MeetingPage,
  toMeetingCursor,
} from "../ports.ts";

/**
 * An in-memory HistoryRepository for tests and offline development. It keeps the port's
 * contract (ordering, paging, idempotent writes, not-found on a deleted session, change
 * events) for one page lifetime; it does not survive a reload.
 */
export interface InMemoryHistoryRepository extends HistoryRepository {
  /** Plays the browser's part: `blocked` makes every other method return unavailable. */
  setStatus(status: HistoryStorageStatus): void;
}

interface Entry {
  readonly session: MeetingSession;
  readonly chat: readonly HistoryChatMessage[];
  readonly recordingIds: readonly RecordingRequestId[];
}

export function createInMemoryHistoryRepository(
  initialStatus: HistoryStorageStatus = "persistent",
): InMemoryHistoryRepository {
  let status = initialStatus;
  let entries: ReadonlyMap<MeetingHistoryId, Entry> = new Map();
  const listeners = new Set<(change: HistoryChange) => void>();

  const emit = (change: HistoryChange): void => {
    for (const listener of [...listeners]) listener(change);
  };

  const replace = (id: MeetingHistoryId, entry: Entry | null): void => {
    const next = new Map(entries);
    if (entry === null) next.delete(id);
    else next.set(id, entry);
    entries = next;
  };

  /** Runs `write` on a kept entry, or returns the not-found / unavailable failure. */
  const updateEntry = (
    id: MeetingHistoryId,
    write: (entry: Entry) => Entry,
  ): Result<Entry, HistoryWriteError> => {
    if (status === "blocked") return err(historyErrors.unavailable());
    const entry = entries.get(id);
    if (entry === undefined) return err(historyErrors.entryNotFound());
    const next = write(entry);
    replace(id, next);
    return ok(next);
  };

  const available = (): Result<void, HistoryStorageError> =>
    status === "blocked" ? err(historyErrors.unavailable()) : ok(undefined);

  return {
    setStatus: (next) => {
      status = next;
    },

    status: async () => status,

    listMeetings: async (query) => {
      query.signal?.throwIfAborted();
      const checked = available();
      if (!checked.ok) return checked;
      return ok(pageOf([...entries.values()].map(summaryOf), query));
    },

    getMeeting: async (id, signal) => {
      signal?.throwIfAborted();
      const checked = available();
      if (!checked.ok) return checked;
      const entry = entries.get(id);
      if (entry === undefined) return ok(null);
      return ok({
        meeting: summaryOf(entry),
        chat: sortedChat(entry.chat),
      } satisfies MeetingDetail);
    },

    createMeeting: async (session) => {
      const checked = available();
      if (!checked.ok) return checked;
      if (entries.has(session.id)) return ok(undefined);
      replace(session.id, { session, chat: [], recordingIds: [] });
      emit({ kind: "meeting-changed", meetingId: session.id });
      return ok(undefined);
    },

    updateMeeting: async (session) => {
      const result = updateEntry(session.id, (entry) => ({
        ...entry,
        session: {
          ...session,
          roomCode: entry.session.roomCode,
          joinedAt: entry.session.joinedAt,
        },
      }));
      if (!result.ok) return result;
      emit({ kind: "meeting-changed", meetingId: session.id });
      return ok(undefined);
    },

    appendChat: async (meetingId, messages) => {
      const added: ChatMessageId[] = [];
      const result = updateEntry(meetingId, (entry) => {
        const known = new Set(entry.chat.map((message) => message.id));
        const fresh = messages.filter((message) => {
          if (message.meetingId !== meetingId || known.has(message.id)) return false;
          known.add(message.id);
          return true;
        });
        added.push(...fresh.map((message) => message.id));
        return { ...entry, chat: [...entry.chat, ...fresh] };
      });
      if (!result.ok) return result;
      if (added.length > 0) {
        emit({ kind: "chat-appended", meetingId, messageIds: added });
        emit({ kind: "meeting-changed", meetingId });
      }
      return ok(undefined);
    },

    linkRecording: async (meetingId, recordingId) => {
      const wasLinked = entries.get(meetingId)?.recordingIds.includes(recordingId) ?? false;
      const result = updateEntry(meetingId, (entry) =>
        wasLinked ? entry : { ...entry, recordingIds: [...entry.recordingIds, recordingId] },
      );
      if (!result.ok) return result;
      if (!wasLinked) emit({ kind: "meeting-changed", meetingId });
      return ok(undefined);
    },

    deleteMeeting: async (id) => {
      const checked = available();
      if (!checked.ok) return checked;
      if (!entries.has(id)) return ok(undefined);
      replace(id, null);
      emit({ kind: "meeting-deleted", meetingId: id });
      return ok(undefined);
    },

    deleteAll: async () => {
      const checked = available();
      if (!checked.ok) return checked;
      entries = new Map();
      emit({ kind: "cleared" });
      return ok(undefined);
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function summaryOf(entry: Entry): MeetingSummary {
  return {
    ...entry.session,
    messageCount: entry.chat.length,
    recordingIds: entry.recordingIds,
  };
}

/** Newest first: `joinedAt` descending, then `id` descending. */
function compareNewestFirst(a: MeetingSummary, b: MeetingSummary): number {
  if (a.joinedAt !== b.joinedAt) return b.joinedAt - a.joinedAt;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

/** Cursor = the position of the last meeting returned, `<joinedAt>:<id>`. */
function cursorOf(meeting: MeetingSummary): MeetingCursor {
  return toMeetingCursor(`${meeting.joinedAt}:${meeting.id}`);
}

function isAfterCursor(meeting: MeetingSummary, cursor: MeetingCursor): boolean {
  const separator = cursor.indexOf(":");
  const joinedAt = Number(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);
  if (meeting.joinedAt !== joinedAt) return meeting.joinedAt < joinedAt;
  return meeting.id < id;
}

function pageOf(all: readonly MeetingSummary[], query: MeetingListQuery): MeetingPage {
  const sorted = [...all].sort(compareNewestFirst);
  const { cursor } = query;
  const remaining = cursor === null ? sorted : sorted.filter((m) => isAfterCursor(m, cursor));
  const limit = Math.max(1, Math.floor(query.limit));
  const meetings = remaining.slice(0, limit);
  const last = meetings.at(-1);
  const hasMore = remaining.length > limit && last !== undefined;
  return { meetings, nextCursor: hasMore ? cursorOf(last) : null, total: sorted.length };
}

/** Oldest first: `sentAt`, then id. */
function sortedChat(chat: readonly HistoryChatMessage[]): readonly HistoryChatMessage[] {
  return [...chat].sort((a, b) => {
    if (a.sentAt !== b.sentAt) return a.sentAt - b.sentAt;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}
