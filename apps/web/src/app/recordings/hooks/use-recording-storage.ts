// TJ-ARCH-MOB-001 compliant
import { useEntityMutation, useEntityQuery } from "@prometheus-ags/entity-graph-react";
import {
  RECORDING_STORAGE_ENTITY,
  RECORDING_STORAGE_ROW_ID,
  type RecordingStorageRow,
} from "../../../infrastructure/entities/recording-entity-types";
import { useAppServices } from "../../app-services";

export interface RecordingStorage {
  /** Null until the first read finishes. */
  readonly info: RecordingStorageRow | null;
  /**
   * Asks the browser to keep recordings (`navigator.storage.persist()`, the "Keep
   * recordings" action); `info.persisted` follows. Call it from a click.
   */
  readonly requestPersistence: () => Promise<void>;
  readonly requesting: boolean;
}

/**
 * Space used and available for recordings, and whether the browser may clear them under
 * pressure. For the screen's storage notice and its "Keep recordings" action.
 */
export function useRecordingStorage(): RecordingStorage {
  const { recordings } = useAppServices();
  const query = useEntityQuery<RecordingStorageRow>(RECORDING_STORAGE_ENTITY);
  const mutation = useEntityMutation<void, RecordingStorageRow, RecordingStorageRow>({
    type: RECORDING_STORAGE_ENTITY,
    mutate: async () => ({
      id: RECORDING_STORAGE_ROW_ID,
      ...(await recordings.library.requestPersistence()),
    }),
    normalize: (row) => ({ id: row.id, data: row }),
  });
  return {
    info: query.items[0] ?? null,
    requestPersistence: async () => {
      await mutation.mutate();
    },
    requesting: mutation.state.isPending,
  };
}
