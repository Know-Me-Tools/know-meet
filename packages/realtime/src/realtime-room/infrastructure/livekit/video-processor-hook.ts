import type { BackgroundEffect } from "@know-meet/domain";
import type { LocalVideoTrack } from "livekit-client";

/** An effect that needs a processor: everything but `none`. */
export type ProcessedBackgroundEffect = Exclude<BackgroundEffect, { readonly kind: "none" }>;

/**
 * The video processor hook (WC-4, ADR-0002 decision 4). The adapter decides *when* a camera
 * track needs an effect, and keeps it true across camera toggles, device switches and
 * republishing after a reconnect; the hook decides *how*. `createBackgroundProcessorHook`
 * (wc07) implements it over `@livekit/track-processors` (`BackgroundProcessor` with
 * `switchTo`); the composition root passes it to `createLiveKitRealtimeRoom({ videoProcessor })`.
 * The port never sees it.
 *
 * Calls arrive one at a time; the adapter never overlaps them.
 */
export interface VideoProcessorHook {
  /**
   * Puts `effect` on `track`, replacing the hook's effect if it already set one there (switch
   * the existing processor rather than stack a second). Rejects when the processor or its
   * assets cannot load; the adapter then shows `failed` and sends the camera unprocessed.
   * Loads its assets on the first call, not before.
   */
  apply(track: LocalVideoTrack, effect: ProcessedBackgroundEffect): Promise<void>;
  /**
   * Gets a processor ready on `track` without changing its picture: loads the library and
   * its assets, and runs segmentation once so the GPU programs are built before the first
   * effect is chosen. Leaves a pass-through processor on the track for `apply` to switch.
   * Rejects (after taking its processor off) when the processor or its assets cannot load.
   */
  prepare(track: LocalVideoTrack): Promise<void>;
  /** Takes the hook's processor off `track`. Resolves when there is none. */
  remove(track: LocalVideoTrack): Promise<void>;
}

/**
 * Where the background processor loads its files from (the seam for wc07 tasks 7.1 and 7.2).
 * Both must be same-origin paths the app serves itself, so `connect-src` stays closed: the
 * tasks-vision WASM file set directory and the pinned segmenter model file. A hook factory
 * that accepts these must pass them to the processor as `assetPaths` on every construction;
 * the library's defaults point at a CDN and an unpinned model.
 */
export interface BackgroundAssetPaths {
  readonly tasksVisionFileSet: string;
  readonly modelAssetPath: string;
}
