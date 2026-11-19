// TJ-ARCH-MOB-001 compliant
import type { HistoryStorageStatus } from "@know-meet/domain";
import { useEntityMutation, useEntityQuery } from "@prometheus-ags/entity-graph-react";
import {
  HISTORY_STORAGE_ENTITY,
  HISTORY_STORAGE_ROW_ID,
  type HistoryStorageRow,
} from "../../../infrastructure/entities/history-entity-types";
import { useAppServices } from "../../app-services";

export interface HistoryStorage {
  /** Null until the first read finishes. */
  readonly status: HistoryStorageStatus | null;
  /**
   * Asks the browser to keep history (`navigator.storage.persist()`); `status` follows.
   * Call it from a click: some browsers refuse otherwise.
   */
  readonly requestPersistence: () => Promise<void>;
  readonly requesting: boolean;
}

/**
 * Whether history is kept, may be cleared by the browser, or is blocked. For the
 * screen's notice and its "keep my history" action.
 */
export function useHistoryStorage(): HistoryStorage {
  const { history } = useAppServices();
  const query = useEntityQuery<HistoryStorageRow>(HISTORY_STORAGE_ENTITY);
  const mutation = useEntityMutation<void, HistoryStorageRow, HistoryStorageRow>({
    type: HISTORY_STORAGE_ENTITY,
    mutate: async () => ({
      id: HISTORY_STORAGE_ROW_ID,
      status: await history.requestPersistence(),
    }),
    normalize: (row) => ({ id: row.id, data: row }),
  });
  return {
    status: query.items[0]?.status ?? null,
    requestPersistence: async () => {
      await mutation.mutate();
    },
    requesting: mutation.state.isPending,
  };
}
