import type { Capability, Note } from "@know-meet/domain";

/** Persists notes. Implemented by the HTTP (BFF) and Tauri IPC adapters. */
export interface NoteRepository {
  list(signal?: AbortSignal): Promise<readonly Note[]>;
  create(title: string): Promise<Note>;
}

/** Supplies capability registry entries (static asset, BFF or Tauri host). */
export interface CapabilitySource {
  list(signal?: AbortSignal): Promise<readonly Capability[]>;
}
