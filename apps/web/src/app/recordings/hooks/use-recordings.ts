// TJ-ARCH-MOB-001 compliant
import type { Support } from "@know-meet/domain";
import { useEntityQuery } from "@prometheus-ags/entity-graph-react";
import { RECORDING_ENTITY } from "../../../infrastructure/entities/recording-entity-types";
import type { LocalRecording } from "../../../infrastructure/recording";
import { useAppServices } from "../../app-services";

export interface Recordings {
  /** Every recording kept on this device, newest first. */
  readonly recordings: readonly LocalRecording[];
  /** True while the first read runs and nothing is shown yet. */
  readonly loading: boolean;
  /** Set when reading failed; a browser without file storage is `support`, not an error. */
  readonly error: string | null;
  /** `unsupported`: this browser cannot keep recordings; show the unsupported state. */
  readonly support: Support;
  /**
   * Reads again. Use it when the screen opens: a recording whose tab died has no change
   * to announce, so only a read shows it turned from "recording" into "incomplete".
   */
  readonly reload: () => void;
}

/**
 * The recordings library list, kept current when a recording starts, ends or is deleted
 * in this tab or any other. Each row has a `state`: recording, complete, stopped-early
 * (storage was full), incomplete, or missing (its file is gone).
 */
export function useRecordings(): Recordings {
  const { recordings } = useAppServices();
  const query = useEntityQuery<LocalRecording>(RECORDING_ENTITY);
  return {
    recordings: [...query.items].sort((a, b) => b.startedAt - a.startedAt),
    loading: query.isLoading,
    error: query.error?.message ?? null,
    support: recordings.library.support,
    reload: query.refetch,
  };
}
