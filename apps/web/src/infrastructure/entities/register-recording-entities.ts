// TJ-ARCH-MOB-001 compliant
import { parseRecordingRequestId } from "@know-meet/domain";
import { registerEntityTransport } from "@prometheus-ags/entity-graph-core";
import type { LocalRecording, RecordingLibrary } from "../recording";
import {
  RECORDING_ENTITY,
  RECORDING_STORAGE_ENTITY,
  RECORDING_STORAGE_ROW_ID,
  type RecordingStorageRow,
} from "./recording-entity-types";

/** A recordings read failed for a reason the screen shows as an error, never as an empty list. */
export class RecordingReadError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`Local recordings could not be read (${code})`);
    this.name = "RecordingReadError";
    this.code = code;
  }
}

/**
 * Registers the recording entity transports with the entity graph (wc10 task 10.3). Call
 * it once at the runtime boundary.
 *
 * The list reads the library whole: a person's recordings number in the dozens, and the
 * library has no filter or sort of its own, so the screen sorts and filters the rows in
 * the graph. A browser without OPFS lists as empty (the screen reads RecordingStorage
 * for the notice); a failed read throws.
 */
export function registerRecordingEntities(library: RecordingLibrary): void {
  const known = new Set<string>();

  registerEntityTransport<LocalRecording>(RECORDING_ENTITY, {
    identify: (recording) => recording.id,
    authoritative: true,
    list: async (query) => {
      const listed = await library.list(query.signal);
      if (!listed.ok) {
        if (listed.error.code === "recordings-unavailable") return { rows: [], total: 0 };
        throw new RecordingReadError(listed.error.code);
      }
      known.clear();
      for (const recording of listed.value) known.add(recording.id);
      return { rows: [...listed.value], total: listed.value.length, nextCursor: null };
    },
    get: async (id) => {
      const recordingId = parseRecordingRequestId(id);
      if (recordingId === null) return null;
      const found = await library.get(recordingId);
      if (!found.ok) throw new RecordingReadError(found.error.code);
      return found.value;
    },
    subscribe: (onChange) => {
      let active = true;
      const unsubscribe = library.subscribe((change) => {
        if (change.kind === "deleted") {
          known.delete(change.id);
          onChange({ op: "delete", id: change.id });
          return;
        }
        void library.get(change.id).then((found) => {
          if (!active || !found.ok) return;
          if (found.value === null) {
            known.delete(change.id);
            onChange({ op: "delete", id: change.id });
            return;
          }
          const op = known.has(change.id) ? "update" : "insert";
          known.add(change.id);
          onChange({ op, id: change.id, row: found.value });
        });
      });
      return () => {
        active = false;
        unsubscribe();
      };
    },
  });

  const readStorage = async (): Promise<RecordingStorageRow> => ({
    id: RECORDING_STORAGE_ROW_ID,
    ...(await library.storage()),
  });

  registerEntityTransport<RecordingStorageRow>(RECORDING_STORAGE_ENTITY, {
    identify: (row) => row.id,
    authoritative: true,
    list: async () => ({ rows: [await readStorage()], total: 1 }),
    get: async () => readStorage(),
  });
}
