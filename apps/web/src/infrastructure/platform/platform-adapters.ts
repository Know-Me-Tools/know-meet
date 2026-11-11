// TJ-ARCH-MOB-001 compliant
import type { CapabilitySource, NoteRepository } from "@know-meet/application";
import { isTauri } from "@tauri-apps/api/core";
import { createHttpCapabilitySource } from "../http/http-capability-source";
import { createHttpNoteRepository } from "../http/http-note-repository";

/** Adapters whose implementation differs between the browser and the Tauri host. */
export interface PlatformAdapters {
  readonly notes: NoteRepository;
  readonly hostCapabilities: CapabilitySource;
}

/** True only inside the Tauri webview. `isTauri()` reads `globalThis.isTauri`, never the IPC bridge. */
export function isTauriRuntime(): boolean {
  return isTauri();
}

/**
 * The single isTauri() guard for platform adapters. The Tauri module is a
 * dynamic import, so the plain web build never evaluates `invoke()`.
 */
export async function loadPlatformAdapters(): Promise<PlatformAdapters> {
  if (isTauriRuntime()) {
    const { createTauriAdapters } = await import("../tauri/tauri-adapters");
    return createTauriAdapters();
  }
  return { notes: createHttpNoteRepository(), hostCapabilities: createHttpCapabilitySource() };
}
