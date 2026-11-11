import type { Note } from "@know-meet/domain";
import type { NoteRepository } from "./ports.ts";

export interface NoteInserted {
  readonly op: "insert";
  readonly id: string;
  readonly row: Note;
}

export type NoteChange = NoteInserted;

/** Notes plus a change stream, so every view of the note list sees a new note. */
export interface NoteFeed {
  list(signal?: AbortSignal): Promise<readonly Note[]>;
  create(title: string): Promise<Note>;
  subscribe(listener: (change: NoteChange) => void): () => void;
}

export function createNoteFeed(repository: NoteRepository): NoteFeed {
  const listeners = new Set<(change: NoteChange) => void>();
  return {
    list: async (signal) => {
      signal?.throwIfAborted();
      const notes = await repository.list(signal);
      signal?.throwIfAborted();
      return notes;
    },
    create: async (title) => {
      const note = await repository.create(title);
      const change: NoteChange = { op: "insert", id: note.id, row: note };
      for (const listener of listeners) listener(change);
      return note;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
