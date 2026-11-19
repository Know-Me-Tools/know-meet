// TJ-ARCH-MOB-001 compliant
import type { MeetingSummary } from "@know-meet/domain";
import { useEntityQuery } from "@prometheus-ags/entity-graph-react";
import { MEETING_SUMMARY_ENTITY } from "../../../infrastructure/entities/history-entity-types";

export interface MeetingHistoryList {
  /** Newest first, every page loaded so far. */
  readonly meetings: readonly MeetingSummary[];
  /** True while the first page is loading and nothing is shown yet. */
  readonly loading: boolean;
  /** True while a further page is loading. */
  readonly loadingMore: boolean;
  /** Set when reading history failed; blocked storage is not an error (see `useHistoryStorage`). */
  readonly error: string | null;
  readonly hasMore: boolean;
  /** Every meeting kept in this browser, across pages; null while unknown. */
  readonly total: number | null;
  readonly loadMore: () => void;
  readonly reload: () => void;
}

/**
 * The history list, newest first, 50 at a time, kept current when a meeting is created,
 * updated or deleted in this tab or any other.
 */
export function useMeetingHistoryList(): MeetingHistoryList {
  const query = useEntityQuery<MeetingSummary>(MEETING_SUMMARY_ENTITY);
  return {
    meetings: query.items,
    loading: query.isLoading,
    loadingMore: query.isFetchingMore,
    error: query.error?.message ?? null,
    hasMore: query.hasNextPage,
    total: query.viewTotal,
    loadMore: query.fetchNextPage,
    reload: query.refetch,
  };
}
