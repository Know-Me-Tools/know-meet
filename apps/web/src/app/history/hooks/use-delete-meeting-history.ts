// TJ-ARCH-MOB-001 compliant
import type { MeetingHistoryId, MeetingSummary } from "@know-meet/domain";
import { useEntityMutation } from "@prometheus-ags/entity-graph-react";
import { MEETING_SUMMARY_ENTITY } from "../../../infrastructure/entities/history-entity-types";
import { useAppServices } from "../../app-services";

export interface DeleteMeetingHistory {
  /** Resolves true once the meeting, its chat and its recording links are gone. */
  readonly deleteMeeting: (id: MeetingHistoryId) => Promise<boolean>;
  readonly pending: boolean;
  readonly error: string | null;
}

export interface DeleteAllMeetingHistory {
  /** Resolves true once every meeting is gone. Recordings are not touched. */
  readonly deleteAll: () => Promise<boolean>;
  readonly pending: boolean;
  readonly error: string | null;
}

/**
 * Deletes one meeting. The list drops it through the repository's change notice, in this
 * tab and in every other. The caller confirms with the person first; this does not.
 */
export function useDeleteMeetingHistory(): DeleteMeetingHistory {
  const { history } = useAppServices();
  const mutation = useEntityMutation<MeetingHistoryId, true, MeetingSummary>({
    type: MEETING_SUMMARY_ENTITY,
    mutate: async (id) => {
      const removed = await history.repository.deleteMeeting(id);
      if (!removed.ok) throw new Error(removed.error.code);
      return true;
    },
  });
  return {
    deleteMeeting: async (id) => (await mutation.mutate(id)) === true,
    pending: mutation.state.isPending,
    error: mutation.state.error,
  };
}

/** Deletes every meeting kept in this browser. The caller confirms first. */
export function useDeleteAllMeetingHistory(): DeleteAllMeetingHistory {
  const { history } = useAppServices();
  const mutation = useEntityMutation<void, true, MeetingSummary>({
    type: MEETING_SUMMARY_ENTITY,
    mutate: async () => {
      const removed = await history.repository.deleteAll();
      if (!removed.ok) throw new Error(removed.error.code);
      return true;
    },
  });
  return {
    deleteAll: async () => (await mutation.mutate()) === true,
    pending: mutation.state.isPending,
    error: mutation.state.error,
  };
}
