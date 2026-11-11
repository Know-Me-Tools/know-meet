// TJ-ARCH-MOB-001 compliant
import type { Capability, Note } from "@know-meet/domain";
import { useEntityMutation, useEntityQuery } from "@prometheus-ags/entity-graph-react";
import { useStore } from "zustand";
import { useNotesServices } from "./notes-services";

export function useNotes() {
  const { createNote, draftStore } = useNotesServices();
  const notes = useEntityQuery<Note>("Note");
  const capabilities = useEntityQuery<Capability>("Capability");
  const mutation = useEntityMutation<string, Note, Note>({
    type: "Note",
    mutate: createNote,
    normalize: (note) => ({ id: note.id, data: note }),
  });
  const draft = useStore(draftStore, (state) => state.draft);
  const setDraft = useStore(draftStore, (state) => state.setDraft);
  const save = async () => {
    const result = await mutation.mutate(draft);
    if (result) setDraft("");
  };
  return {
    capabilities: capabilities.items,
    capabilityError: capabilities.error?.message,
    items: notes.items,
    loading: notes.isLoading,
    error: mutation.state.error ?? notes.error?.message,
    saving: mutation.state.isPending,
    draft,
    setDraft,
    save,
  };
}
