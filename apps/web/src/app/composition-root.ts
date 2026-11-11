// TJ-ARCH-MOB-001 compliant
import {
  createCapabilityCatalog,
  createNoteDraftStore,
  createNoteFeed,
  createThemeStore,
} from "@know-meet/application";
import { registerNoteEntities } from "../infrastructure/entities/register-note-entities";
import { createStaticCapabilitySource } from "../infrastructure/http/http-capability-source";
import { loadPlatformAdapters } from "../infrastructure/platform/platform-adapters";
import {
  createDocumentThemeApplier,
  createLocalStorageThemePreference,
  createMediaQuerySystemTheme,
} from "../infrastructure/theme/theme-adapters";
import type { AppServices } from "./app-services";

/**
 * The only place adapters meet use cases. Theme is resolved and applied first,
 * before the platform adapters load, so the saved `km-meet-theme` wins before
 * React renders. Entity transports register here; nothing fetches until a
 * screen subscribes.
 */
export async function composeApp(view: Window): Promise<AppServices> {
  const theme = createThemeStore({
    preference: createLocalStorageThemePreference(view.localStorage),
    system: createMediaQuerySystemTheme(view),
    applier: createDocumentThemeApplier(view.document.documentElement),
  });
  const platform = await loadPlatformAdapters();
  const feed = createNoteFeed(platform.notes);
  const capabilities = createCapabilityCatalog([
    createStaticCapabilitySource(),
    platform.hostCapabilities,
  ]);
  registerNoteEntities(feed, capabilities);
  return {
    theme,
    notes: { createNote: (title) => feed.create(title), draftStore: createNoteDraftStore() },
  };
}
