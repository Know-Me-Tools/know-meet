// TJ-ARCH-MOB-001 compliant
import {
  type HistoryChatMessage,
  type MeetingHistoryId,
  type MeetingSummary,
  parseMeetingHistoryId,
} from "@know-meet/domain";
import { useEntity } from "@prometheus-ags/entity-graph-react";
import { useEffect } from "react";
import {
  MEETING_DETAIL_ENTITY,
  type MeetingDetailRow,
} from "../../../infrastructure/entities/history-entity-types";
import { useAppServices } from "../../app-services";

export interface MeetingHistoryDetail {
  readonly meeting: MeetingSummary | null;
  /** Oldest first. */
  readonly chat: readonly HistoryChatMessage[];
  readonly loading: boolean;
  /** True once the read finished and the meeting is not kept (deleted, or never was). */
  readonly notFound: boolean;
  readonly error: string | null;
  readonly reload: () => void;
}

/**
 * One meeting with its chat. Reads again when the meeting changes in this tab or another
 * (chat arriving, a recording linked) and shows `notFound` once it is deleted. Pass null
 * for no selection; nothing is read then.
 */
export function useMeetingHistoryDetail(id: MeetingHistoryId | null): MeetingHistoryDetail {
  const { history } = useAppServices();
  const repository = history.repository;
  const result = useEntity<MeetingDetailRow, MeetingDetailRow>({
    type: MEETING_DETAIL_ENTITY,
    id,
    enabled: id !== null,
    fetch: async (meetingId) => {
      const parsed = parseMeetingHistoryId(meetingId);
      if (parsed === null) return { id: meetingId, meeting: null, chat: [] };
      const read = await repository.getMeeting(parsed);
      if (!read.ok) throw new Error(read.error.code);
      return {
        id: meetingId,
        meeting: read.value?.meeting ?? null,
        chat: read.value?.chat ?? [],
      };
    },
    normalize: (row) => row,
  });
  const { refetch } = result;

  useEffect(() => {
    if (id === null) return undefined;
    return repository.subscribe((change) => {
      if (change.kind === "cleared" || change.meetingId === id) refetch();
    });
  }, [repository, id, refetch]);

  const row = result.data;
  return {
    meeting: row?.meeting ?? null,
    chat: row?.chat ?? [],
    loading: id !== null && row === null && result.error === null,
    notFound: row !== null && row.meeting === null,
    error: result.error,
    reload: refetch,
  };
}
