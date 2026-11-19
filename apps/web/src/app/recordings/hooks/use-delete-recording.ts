// TJ-ARCH-MOB-001 compliant
import type { RecordingRequestId } from "@know-meet/domain";
import { useEntityMutation } from "@prometheus-ags/entity-graph-react";
import { RECORDING_ENTITY } from "../../../infrastructure/entities/recording-entity-types";
import type { LocalRecording } from "../../../infrastructure/recording";
import { useAppServices } from "../../app-services";

export interface DeleteRecording {
  /**
   * Resolves true once the file and its row are gone. False when it could not be deleted;
   * `error` is then `recording-in-progress` (still being recorded) or `recordings-failed`.
   */
  readonly deleteRecording: (id: RecordingRequestId) => Promise<boolean>;
  readonly pending: boolean;
  readonly error: string | null;
}

/**
 * Deletes one recording permanently. The list drops it through the library's change
 * notice, in this tab and in every other. The caller confirms with the person first; this
 * does not. Meetings in history that link to it keep the link and show it as gone.
 */
export function useDeleteRecording(): DeleteRecording {
  const { recordings } = useAppServices();
  const mutation = useEntityMutation<RecordingRequestId, true, LocalRecording>({
    type: RECORDING_ENTITY,
    mutate: async (id) => {
      const removed = await recordings.library.remove(id);
      if (!removed.ok) throw new Error(removed.error.code);
      return true;
    },
  });
  return {
    deleteRecording: async (id) => (await mutation.mutate(id)) === true,
    pending: mutation.state.isPending,
    error: mutation.state.error,
  };
}
