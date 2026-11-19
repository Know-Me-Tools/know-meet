// TJ-ARCH-MOB-001 compliant
import { type HistoryRepository, toMeetingCursor } from "@know-meet/application";
import {
  type MeetingHistoryId,
  type MeetingSummary,
  parseMeetingHistoryId,
} from "@know-meet/domain";
import { registerEntityTransport } from "@prometheus-ags/entity-graph-core";
import {
  HISTORY_STORAGE_ENTITY,
  HISTORY_STORAGE_ROW_ID,
  type HistoryStorageRow,
  MEETING_SUMMARY_ENTITY,
} from "./history-entity-types";

/** The history screen asks for 50 at a time (ports.ts). */
const DEFAULT_PAGE_SIZE = 50;

/** A history read failed for a reason the screen shows as an error, never as an empty list. */
export class HistoryReadError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`Local history could not be read (${code})`);
    this.name = "HistoryReadError";
    this.code = code;
  }
}

/**
 * Registers the history entity transports with the entity graph (wc09 task 9.3). Call it
 * once at the runtime boundary.
 *
 * Both transports read the local store through the repository and nothing else. The
 * repository has no filter, sort or search of its own: it pages newest first with
 * `limit` and `cursor`, and `signal` cancels a read. The transports are `authoritative`,
 * so any view filter or sort the screen applies runs on the rows already in the graph.
 * Blocked storage lists as empty (the screen reads HistoryStorage for the notice); a
 * failed read throws.
 */
export function registerHistoryEntities(history: HistoryRepository): void {
  /** Ids this tab has put in the graph, so a change becomes an insert or an update. */
  const known = new Set<string>();

  registerEntityTransport<MeetingSummary>(MEETING_SUMMARY_ENTITY, {
    identify: (meeting) => meeting.id,
    authoritative: true,
    list: async (query) => {
      const cursor =
        query.cursor === null || query.cursor === undefined
          ? null
          : toMeetingCursor(String(query.cursor));
      const page = await history.listMeetings({
        limit: query.limit ?? DEFAULT_PAGE_SIZE,
        cursor,
        ...(query.signal === undefined ? {} : { signal: query.signal }),
      });
      if (!page.ok) {
        if (page.error.code === "history-unavailable") return { rows: [], total: 0 };
        throw new HistoryReadError(page.error.code);
      }
      for (const meeting of page.value.meetings) known.add(meeting.id);
      return {
        rows: [...page.value.meetings],
        total: page.value.total,
        nextCursor: page.value.nextCursor,
      };
    },
    get: async (id, signal) => {
      const meetingId = parseMeetingHistoryId(id);
      if (meetingId === null) return null;
      const detail = await history.getMeeting(meetingId, signal);
      if (!detail.ok) throw new HistoryReadError(detail.error.code);
      return detail.value?.meeting ?? null;
    },
    subscribe: (onChange) => {
      let active = true;
      const refresh = async (id: MeetingHistoryId): Promise<void> => {
        const detail = await history.getMeeting(id);
        if (!active || !detail.ok) return;
        if (detail.value === null) {
          known.delete(id);
          onChange({ op: "delete", id });
          return;
        }
        const op = known.has(id) ? "update" : "insert";
        known.add(id);
        onChange({ op, id, row: detail.value.meeting });
      };
      const unsubscribe = history.subscribe((change) => {
        switch (change.kind) {
          case "meeting-changed":
            void refresh(change.meetingId);
            return;
          case "meeting-deleted":
            known.delete(change.meetingId);
            onChange({ op: "delete", id: change.meetingId });
            return;
          case "cleared":
            for (const id of known) onChange({ op: "delete", id });
            known.clear();
            return;
          case "chat-appended":
            // Always followed by meeting-changed, which carries the new message count.
            return;
        }
      });
      return () => {
        active = false;
        unsubscribe();
      };
    },
  });

  const readStorage = async (): Promise<HistoryStorageRow> => ({
    id: HISTORY_STORAGE_ROW_ID,
    status: await history.status(),
  });

  registerEntityTransport<HistoryStorageRow>(HISTORY_STORAGE_ENTITY, {
    identify: (row) => row.id,
    authoritative: true,
    list: async () => ({ rows: [await readStorage()], total: 1 }),
    get: async () => readStorage(),
  });
}
