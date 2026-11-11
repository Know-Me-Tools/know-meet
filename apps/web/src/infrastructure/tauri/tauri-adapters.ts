// TJ-ARCH-MOB-001 compliant
// Loaded only through loadPlatformAdapters() after isTauri() is true. Never import
// this module statically from shared web code: invoke() reads the Tauri runtime.
import type { CapabilitySource, NoteRepository } from "@know-meet/application";
import { invoke } from "@tauri-apps/api/core";
import { decodeCapabilities, decodeNote, decodeNotes } from "../http/decode";
import type { PlatformAdapters } from "../platform/platform-adapters";

function createTauriNoteRepository(): NoteRepository {
  return {
    list: async (signal) => {
      signal?.throwIfAborted();
      const notes = decodeNotes(await invoke<unknown>("list_notes"));
      signal?.throwIfAborted();
      return notes;
    },
    create: async (title) => decodeNote(await invoke<unknown>("create_note", { title })),
  };
}

function createTauriCapabilitySource(): CapabilitySource {
  return {
    list: async () => decodeCapabilities(await invoke<unknown>("list_capabilities")),
  };
}

export function createTauriAdapters(): PlatformAdapters {
  return { notes: createTauriNoteRepository(), hostCapabilities: createTauriCapabilitySource() };
}
