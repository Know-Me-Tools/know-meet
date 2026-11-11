// TJ-ARCH-MOB-001 compliant
import type { NoteRepository } from "@know-meet/application";
import { decodeNote, decodeNotes } from "./decode";

const NOTES_ENDPOINT = "/api/notes";

async function requestJson(init: RequestInit): Promise<unknown> {
  const response = await fetch(NOTES_ENDPOINT, init);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

/** Notes through the same-origin BFF (`services/bff`). */
export function createHttpNoteRepository(): NoteRepository {
  return {
    list: async (signal) => decodeNotes(await requestJson(signal ? { signal } : {})),
    create: async (title) =>
      decodeNote(
        await requestJson({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }),
      ),
  };
}
