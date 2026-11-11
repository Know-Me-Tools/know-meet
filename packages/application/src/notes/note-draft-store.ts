import { createStore, type StoreApi } from "zustand/vanilla";

export interface NoteDraftState {
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
}

export type NoteDraftStore = StoreApi<NoteDraftState>;

/** Unsaved note text before it becomes a Note entity. */
export function createNoteDraftStore(): NoteDraftStore {
  return createStore<NoteDraftState>()((set) => ({
    draft: "",
    setDraft: (draft) => set({ draft }),
  }));
}
