// TJ-ARCH-MOB-001 compliant
import type { HistoryChatMessage, HistoryStorageStatus, MeetingSummary } from "@know-meet/domain";

/** Entity type names the history transports register under. */
export const MEETING_SUMMARY_ENTITY = "MeetingSummary";
export const MEETING_DETAIL_ENTITY = "MeetingDetail";
export const HISTORY_STORAGE_ENTITY = "HistoryStorage";

/** The one row of the HistoryStorage entity. */
export const HISTORY_STORAGE_ROW_ID = "storage";

/** Whether this browser keeps history, and whether it may clear it by itself. */
export interface HistoryStorageRow {
  readonly id: typeof HISTORY_STORAGE_ROW_ID;
  readonly status: HistoryStorageStatus;
}

/**
 * One meeting with its chat. `meeting` is null when the id is not kept (deleted, perhaps
 * in another tab). Read by id through `useEntity`; there is no list of details.
 */
export interface MeetingDetailRow {
  readonly id: string;
  readonly meeting: MeetingSummary | null;
  readonly chat: readonly HistoryChatMessage[];
}
