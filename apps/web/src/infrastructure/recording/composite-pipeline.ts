// TJ-ARCH-MOB-001 compliant
import type { RealtimeRoom } from "@know-meet/application";
import { type AudioMixer, createAudioMixer } from "./audio-mixer";
import { type FrameClock, startFrameClock } from "./frame-clock";
import { createFrameCompositor, readCompositePalette } from "./frame-compositor";
import {
  type CaptureMicrophone,
  createLocalMicrophoneFeed,
  LOCAL_MICROPHONE_KEY,
} from "./local-microphone";
import { createMediaBindings } from "./media-bindings";
import {
  AUDIO_BITS_PER_SECOND,
  COMPOSITE_FPS,
  COMPOSITE_HEIGHT,
  COMPOSITE_WIDTH,
  RECORDER_TIMESLICE_MS,
  VIDEO_BITS_PER_SECOND,
} from "./recording-constants";
import type { ChosenFormat } from "./recording-support";

export interface CompositePipelineOptions {
  readonly room: RealtimeRoom;
  readonly format: ChosenFormat;
  readonly captureMicrophone: CaptureMicrophone;
  /** One encoded chunk, in order, about every second. */
  readonly onChunk: (chunk: Blob) => void;
  /** The encoder failed; the pipeline is not usable afterwards. */
  readonly onError: () => void;
}

/**
 * The picture and sound of one recording (wc10 task 10.1): a canvas grid of the room's
 * video tiles and one mixed audio track, encoded by `MediaRecorder`.
 *
 *   room.attachMedia ──> hidden <video> per camera / share ──> canvas grid ──┐
 *                                                                              ├─> MediaStream ─> MediaRecorder ─> onChunk
 *   room.attachMedia ──> hidden <audio> per remote mic ──> WebAudio mix ──────┤
 *   local microphone (own capture, gain 0 while muted) ──────────────────────┘
 *
 * The room is only read through `RealtimeRoom`, so no media SDK is imported here.
 */
export interface CompositePipeline {
  /** Starts drawing and encoding. Call once. */
  start(): void;
  /**
   * Stops drawing and encoding and resolves once the last chunk was handed to `onChunk`.
   * Safe to call twice.
   */
  finish(): Promise<void>;
  /** Releases the elements, the audio graph and the capture. Call after `finish`. */
  dispose(): Promise<void>;
}

const FINISH_TIMEOUT_MS = 5000;
/** Audio sources are re-read this often, to notice a track that was replaced. */
const AUDIO_SYNC_FRAMES = COMPOSITE_FPS * 2;

export function createCompositePipeline(options: CompositePipelineOptions): CompositePipeline {
  const { room } = options;
  const canvas = document.createElement("canvas");
  canvas.width = COMPOSITE_WIDTH;
  canvas.height = COMPOSITE_HEIGHT;
  const compositor = createFrameCompositor(canvas, readCompositePalette(document.documentElement));
  const bindings = createMediaBindings(room);
  const mixer: AudioMixer = createAudioMixer();
  const microphone = createLocalMicrophoneFeed(mixer, options.captureMicrophone);

  const syncAudio = (): void => {
    const keys = new Set<string>([LOCAL_MICROPHONE_KEY]);
    for (const media of bindings.current()) {
      if (media.medium !== "audio") continue;
      keys.add(media.key);
      const source = media.element.srcObject;
      mixer.setSource(media.key, source instanceof MediaStream ? source : null, 1);
    }
    mixer.keepOnly(keys);
  };

  const syncRoom = (): void => {
    const snapshot = room.getSnapshot();
    bindings.sync(snapshot);
    microphone.sync(snapshot);
    syncAudio();
  };

  syncRoom();
  compositor.draw(bindings.current());

  const videoTrack = canvas.captureStream(COMPOSITE_FPS).getVideoTracks();
  const stream = new MediaStream([...videoTrack, ...mixer.stream.getAudioTracks()]);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: options.format.mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
  } catch (error) {
    // The encoder refused the format: release what was opened above before reporting it.
    microphone.dispose();
    bindings.dispose();
    for (const track of stream.getTracks()) track.stop();
    void mixer.close();
    throw error;
  }
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) options.onChunk(event.data);
  });
  recorder.addEventListener("error", () => options.onError());

  let clock: FrameClock | null = null;
  let frames = 0;
  let unsubscribe: (() => void) | null = null;
  let finishing: Promise<void> | null = null;
  let disposed = false;

  const stopClock = (): void => {
    clock?.stop();
    clock = null;
    unsubscribe?.();
    unsubscribe = null;
  };

  return {
    start: () => {
      void mixer.resume();
      unsubscribe = room.subscribe(syncRoom);
      clock = startFrameClock(COMPOSITE_FPS, () => {
        frames += 1;
        if (frames % AUDIO_SYNC_FRAMES === 0) syncAudio();
        compositor.draw(bindings.current());
      });
      recorder.start(RECORDER_TIMESLICE_MS);
    },
    finish: () => {
      finishing ??= new Promise<void>((resolve) => {
        stopClock();
        if (recorder.state === "inactive") {
          resolve();
          return;
        }
        const timer = setTimeout(resolve, FINISH_TIMEOUT_MS);
        // The encoder fires its last `dataavailable` before `stop`.
        recorder.addEventListener(
          "stop",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
        try {
          recorder.stop();
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
      return finishing;
    },
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      stopClock();
      microphone.dispose();
      bindings.dispose();
      for (const track of stream.getTracks()) track.stop();
      await mixer.close();
    },
  };
}
