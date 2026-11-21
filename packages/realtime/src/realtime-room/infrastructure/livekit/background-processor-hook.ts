import type {
  BackgroundProcessorWrapper,
  SwitchBackgroundProcessorOptions,
} from "@livekit/track-processors";
import type { LocalVideoTrack } from "livekit-client";
import type {
  BackgroundAssetPaths,
  ProcessedBackgroundEffect,
  VideoProcessorHook,
} from "./video-processor-hook.ts";

type TrackProcessorsModule = typeof import("@livekit/track-processors");

/**
 * How long `prepare` waits for the first segmented frame. A cold GPU program build measured
 * 6.5 s on an M1 Max (evidence/wc4-measure-2026-11-20); past this the processor is left in
 * pass-through and the first effect finishes the build instead.
 */
const PREPARE_FRAME_TIMEOUT_MS = 20_000;

/**
 * Blur radius 0 makes the library segment every frame but composite the frame over itself,
 * so the picture others receive is unchanged while MediaPipe builds its GPU programs.
 */
const PASS_THROUGH_SEGMENTATION: SwitchBackgroundProcessorOptions = {
  mode: "background-blur",
  blurRadius: 0,
};

/** The effect as the processor's `switchTo` takes it. Blur keeps the library's default radius. */
function toSwitchOptions(effect: ProcessedBackgroundEffect): SwitchBackgroundProcessorOptions {
  if (effect.kind === "blur") return { mode: "background-blur" };
  return { mode: "virtual-background", imagePath: effect.imageUrl };
}

/**
 * The `VideoProcessorHook` over `@livekit/track-processors` 0.8.3 (WC-4).
 *
 * - **Lazy.** The library (and MediaPipe behind it) is imported on the first `apply`, not when
 *   the hook is created, so a meeting without effects never downloads it.
 * - **One processor per track, switched.** The first effect on a track constructs a
 *   `BackgroundProcessor` in `disabled` mode (frames pass through unchanged, as the camera
 *   already looks), sets it on the track, then `switchTo`s the effect. Later effects on the
 *   same track only `switchTo`. Construction in `disabled` mode matters: the library only
 *   logs a background image that fails to load during construction or `init`, but `switchTo`
 *   rejects, so a missing preset image surfaces as a failure instead of a silent no-op.
 * - **Failure leaves the camera unprocessed.** If loading the library, the WASM, the model or
 *   the image rejects, the hook takes its processor off the track before rejecting, so the
 *   adapter's `failed` status is true of what others receive.
 *
 * - **Prepared before a choice (repair 9).** The first segmented frame on a processor blocks
 *   the page while MediaPipe builds its GPU programs (0.5 s warm, 6.5 s cold, profiled in
 *   evidence/wc4-profile-2026-11-20). `prepare` runs that frame while the Background section
 *   says "Preparing", with segmentation composited over the unchanged frame, then returns the
 *   processor to `disabled`. `apply` later switches the same processor, already built.
 *
 * `paths` are the same-origin locations of the tasks-vision WASM file set and the pinned
 * segmenter model. They go to every processor this hook constructs as `assetPaths`, so
 * MediaPipe never falls back to its CDN defaults (`connect-src` would block them).
 */
export function createBackgroundProcessorHook(paths: BackgroundAssetPaths): VideoProcessorHook {
  const assetPaths = {
    tasksVisionFileSet: paths.tasksVisionFileSet,
    modelAssetPath: paths.modelAssetPath,
  };
  const ours = new WeakSet<object>();
  /** Processors whose GPU programs have been built by a segmented frame. */
  const built = new WeakSet<object>();
  /** Resolvers waiting for a processor's next processed frame. */
  const frameWaiters = new WeakMap<object, () => void>();
  let loading: Promise<TrackProcessorsModule> | null = null;

  /** Imports the library once; a failed import is forgotten so a later request can retry. */
  const loadLibrary = (): Promise<TrackProcessorsModule> => {
    loading ??= import("@livekit/track-processors").catch((error: unknown) => {
      loading = null;
      throw error;
    });
    return loading;
  };

  /** The processor this hook set on `track`, if it is still there. */
  const processorOn = (track: LocalVideoTrack): BackgroundProcessorWrapper | null => {
    const current = track.getProcessor();
    return current !== undefined && isOurs(current) ? current : null;
  };

  /** Only processors this hook constructed are in `ours`, and each is a wrapper. */
  const isOurs = (candidate: object): candidate is BackgroundProcessorWrapper =>
    ours.has(candidate);

  const attach = async (track: LocalVideoTrack): Promise<BackgroundProcessorWrapper> => {
    const existing = processorOn(track);
    if (existing !== null) return existing;
    const library = await loadLibrary();
    const processor: BackgroundProcessorWrapper = library.BackgroundProcessor({
      mode: "disabled",
      assetPaths,
      onFrameProcessed: () => {
        built.add(processor);
        const resolve = frameWaiters.get(processor);
        frameWaiters.delete(processor);
        resolve?.();
      },
    });
    ours.add(processor);
    // Rejects when the WASM file set or the model cannot load; the track keeps no processor.
    await track.setProcessor(processor);
    return processor;
  };

  /** Resolves on the processor's next processed frame, or after the timeout. */
  const nextProcessedFrame = (processor: BackgroundProcessorWrapper): Promise<void> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => {
        frameWaiters.delete(processor);
        resolve();
      }, PREPARE_FRAME_TIMEOUT_MS);
      frameWaiters.set(processor, () => {
        clearTimeout(timer);
        resolve();
      });
    });

  const remove = async (track: LocalVideoTrack): Promise<void> => {
    if (processorOn(track) === null) return;
    await track.stopProcessor();
  };

  return {
    prepare: async (track) => {
      try {
        const processor = await attach(track);
        // An effect already on the track has built the programs; never disturb it.
        if (built.has(processor) || processor.mode !== "disabled") return;
        const frame = nextProcessedFrame(processor);
        await processor.switchTo(PASS_THROUGH_SEGMENTATION);
        await frame;
        await processor.switchTo({ mode: "disabled" });
      } catch (error: unknown) {
        await remove(track).catch(() => undefined);
        throw error;
      }
    },
    apply: async (track, effect) => {
      try {
        const processor = await attach(track);
        await processor.switchTo(toSwitchOptions(effect));
      } catch (error: unknown) {
        // The primary error is what the adapter reports. A failure to take the processor off
        // again cannot be reported separately through this seam; the adapter's next refresh
        // sees whatever processor is left and reconciles against it.
        await remove(track).catch(() => undefined);
        throw error;
      }
    },
    remove,
  };
}
