import type {
  ChatMessageId,
  HistoryChatMessage,
  HistoryEntryNotFound,
  HistoryStorageError,
  HistoryStorageStatus,
  MeetingHistoryId,
  MeetingSession,
  MeetingSummary,
  RecordingRequestId,
  Result,
} from "@know-meet/domain";

/**
 * Opaque position in the meeting list. Only the repository that returned it can read it;
 * pass it back unchanged to get the next page.
 */
export type MeetingCursor = string & { readonly __brand: "MeetingCursor" };

/** Marks a repository-made string as a cursor. Only repository adapters call it. */
export function toMeetingCursor(value: string): MeetingCursor {
  return value as MeetingCursor;
}

export interface MeetingListQuery {
  /** Page size, at least 1. The history screen asks for 50 at a time. */
  readonly limit: number;
  /** Null for the first page. */
  readonly cursor: MeetingCursor | null;
  readonly signal?: AbortSignal;
}

export interface MeetingPage {
  /** Newest first: by `joinedAt` descending, then `id` descending. */
  readonly meetings: readonly MeetingSummary[];
  /** Null when this page is the last. */
  readonly nextCursor: MeetingCursor | null;
  /** Every meeting kept in this browser, across all pages. */
  readonly total: number;
}

/** One meeting with every chat message kept for it, oldest first (`sentAt`, then id). */
export interface MeetingDetail {
  readonly meeting: MeetingSummary;
  readonly chat: readonly HistoryChatMessage[];
}

/**
 * What changed in the store, from this tab or any other tab of the same site. Listeners
 * re-read what they show; the change carries ids only, never history text.
 *
 * - `meeting-changed`: created or updated, including its message count or recordings.
 * - `chat-appended`: new messages were kept for a meeting (it is also `meeting-changed`).
 */
export type HistoryChange =
  | { readonly kind: "meeting-changed"; readonly meetingId: MeetingHistoryId }
  | {
      readonly kind: "chat-appended";
      readonly meetingId: MeetingHistoryId;
      readonly messageIds: readonly ChatMessageId[];
    }
  | { readonly kind: "meeting-deleted"; readonly meetingId: MeetingHistoryId }
  | { readonly kind: "cleared" };

/** HistoryEntryNotFound: the meeting was deleted (perhaps in another tab) or never kept. */
export type HistoryWriteError = HistoryStorageError | HistoryEntryNotFound;

/**
 * This browser's history of meetings and the chat it received (WC-7, decisions D1, D3,
 * D5). The web adapter (wc09 task 9.2) keeps it in PGlite on `idb://` behind a
 * leader-elected worker; entity transports read it and nothing else.
 *
 * - Local only. No method sends anything over the network, and an adapter must not
 *   either: not to a server, not to other participants (no chat backfill, D3).
 * - Expected failures are results, never throws. When `status()` is `blocked`, every other
 *   method returns HistoryUnavailable and `subscribe` never fires.
 * - A fired `signal` rejects the promise with the signal's reason (an AbortError), the
 *   standard abort behaviour entity transports rely on; abort is not a storage failure.
 * - Every write is idempotent, so a retry after an uncertain outcome is safe.
 * - After a write resolves, a read in any tab sees it, and `subscribe` listeners in every
 *   tab are told.
 * - Recordings are a separate store (wc10). History only refers to them by id; no delete
 *   here ever removes a recording.
 */
export interface HistoryRepository {
  /** Whether this browser can keep history and whether it may clear it by itself. */
  status(): Promise<HistoryStorageStatus>;

  listMeetings(query: MeetingListQuery): Promise<Result<MeetingPage, HistoryStorageError>>;

  /** The meeting and its chat, or null when it is not kept (deleted or unknown id). */
  getMeeting(
    id: MeetingHistoryId,
    signal?: AbortSignal,
  ): Promise<Result<MeetingDetail | null, HistoryStorageError>>;

  /**
   * Keeps a new session as given (session start). Creating an id that already exists
   * changes nothing and succeeds.
   */
  createMeeting(session: MeetingSession): Promise<Result<void, HistoryStorageError>>;

  /**
   * Replaces a kept session's title, `leftAt`, `endReason` and participants (people seen,
   * session end); `roomCode` and `joinedAt` never change. A deleted session is not
   * recreated: HistoryEntryNotFound.
   */
  updateMeeting(session: MeetingSession): Promise<Result<void, HistoryWriteError>>;

  /**
   * Keeps chat messages for a session, all or none. Messages whose (meetingId, id) is
   * already kept are skipped, so appending the same message twice keeps it once. Every
   * message's `meetingId` must equal `meetingId`. HistoryEntryNotFound when the session
   * is not kept.
   */
  appendChat(
    meetingId: MeetingHistoryId,
    messages: readonly HistoryChatMessage[],
  ): Promise<Result<void, HistoryWriteError>>;

  /**
   * Records that a local recording was made during the session, so its row shows the
   * recording and the detail links to it. Linking twice keeps one link. The recording
   * itself is not touched and need not exist yet.
   */
  linkRecording(
    meetingId: MeetingHistoryId,
    recordingId: RecordingRequestId,
  ): Promise<Result<void, HistoryWriteError>>;

  /**
   * Removes the session, its chat and its recording links, permanently. Recordings stay
   * in the recordings store. Deleting an id that is not kept succeeds.
   */
  deleteMeeting(id: MeetingHistoryId): Promise<Result<void, HistoryStorageError>>;

  /** Removes every session, message and link. Recordings stay. */
  deleteAll(): Promise<Result<void, HistoryStorageError>>;

  /** Tells the listener about every change from now on. Returns the unsubscribe function. */
  subscribe(listener: (change: HistoryChange) => void): () => void;
}
