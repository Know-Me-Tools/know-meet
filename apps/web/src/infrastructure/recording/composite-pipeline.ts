// TJ-ARCH-MOB-001 compliant
import type { RealtimeRoom, RecordingCapturePolicy } from "@know-meet/application";
import { createAudioMixer } from "./audio-mixer";
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
import { observeVideoProgress, type VideoProgress } from "./video-progress";

export interface CompositePipelineOptions {
  readonly room: RealtimeRoom;
  readonly capture: RecordingCapturePolicy | undefined;
  readonly format: ChosenFormat;
  readonly captureMicrophone: CaptureMicrophone;
  readonly onChunk: (chunk: Blob) => void;
  readonly onError: () => void;
}

export interface CompositePipeline {
  /** Prepare the speaking participant’s recorder-only mic before the first encoded frame. */
  prepare(): Promise<void>;
  /** Start the native encoder on a blank canvas and a mixer with no sources. */
  startEncoder(): Promise<boolean>;
  /** Attach live room sources after the start announcement succeeds. */
  startCapture(): void;
  /** Cuts all live inputs in this call. The promise waits only for previously admitted output. */
  finish(): Promise<void>;
  /** Source times retained for checking expected visual change during finalization. */
  videoProgress(): VideoProgress | undefined;
}

// A recorder that never acknowledges start must release pending startup and its resources.
const ENCODER_START_TIMEOUT_MS = 5000;
// A missing final stop event leaves no usable completion receipt from the encoder.
const ENCODER_DRAIN_TIMEOUT_MS = 5000;
const AUDIO_SYNC_FRAMES = COMPOSITE_FPS * 2;

export function createCompositePipeline(options: CompositePipelineOptions): CompositePipeline {
  const { room, capture } = options;
  const canvas = document.createElement("canvas");
  canvas.width = COMPOSITE_WIDTH;
  canvas.height = COMPOSITE_HEIGHT;
  const compositor = createFrameCompositor(canvas, readCompositePalette(document.documentElement));
  const sourceProgress = observeVideoProgress(canvas);
  const bindings = createMediaBindings(
    room,
    capture && ((identity, admission) => capture.allows(identity, admission)),
  );
  const mixer = createAudioMixer();
  const microphone = createLocalMicrophoneFeed(mixer, options.captureMicrophone);

  let videoTracks: MediaStreamTrack[] = [];
  let recorder: MediaRecorder;
  try {
    videoTracks = canvas.captureStream(COMPOSITE_FPS).getVideoTracks();
    const stream = new MediaStream([...videoTracks, ...mixer.stream.getAudioTracks()]);
    recorder = new MediaRecorder(stream, {
      mimeType: options.format.mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });
  } catch (error) {
    for (const track of videoTracks) track.stop();
    void mixer.close();
    throw error;
  }

  let clock: FrameClock | null = null;
  let frames = 0;
  let unsubscribeRoom: (() => void) | undefined;
  let unsubscribeConsent: (() => void) | undefined;
  let ended = false;
  let started = false;
  let captureStartedAt: number | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let drainTimer: ReturnType<typeof setTimeout> | undefined;
  let outputClosed = false;
  let resolveStart: (started: boolean) => void;
  const encoderStarted = new Promise<boolean>((resolve) => {
    resolveStart = resolve;
  });
  let resolveDrained: () => void;
  const drained = new Promise<void>((resolve) => {
    resolveDrained = resolve;
  });

  const settleStart = (success: boolean): void => {
    clearTimeout(startupTimer);
    resolveStart(success);
  };

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

  const drawCapture = (): void => {
    const drewSourceFrame = compositor.draw(bindings.current());
    if (drewSourceFrame && captureStartedAt !== undefined)
      sourceProgress.observe(performance.now() - captureStartedAt);
  };

  const syncRoom = (): void => {
    if (ended || capture?.signal.aborted) return;
    const snapshot = room.getSnapshot();
    bindings.sync(snapshot);
    const local = snapshot.local;
    void microphone.sync(snapshot, local !== null && (capture?.allows(local.identity) ?? true));
    syncAudio();
    drawCapture();
  };

  const drawFrame = (): void => {
    if (ended || capture?.signal.aborted) return;
    if (captureStartedAt === undefined) {
      compositor.draw([]);
      return;
    }
    frames += 1;
    if (frames % AUDIO_SYNC_FRAMES === 0) syncAudio();
    drawCapture();
  };

  recorder.addEventListener("dataavailable", (event) => {
    if (!outputClosed && event.data.size > 0) options.onChunk(event.data);
  });
  // A browser can dispatch a queued start during error or stop cleanup. An inactive
  // recorder must never produce a successful startup receipt.
  recorder.addEventListener("start", () => settleStart(!ended && recorder.state === "recording"), {
    once: true,
  });
  recorder.addEventListener("error", () => {
    settleStart(false);
    options.onError();
  });
  recorder.addEventListener(
    "stop",
    () => {
      settleStart(false);
      outputClosed = true;
      clearTimeout(drainTimer);
      resolveDrained();
      if (!ended) options.onError();
    },
    { once: true },
  );

  return {
    prepare: async () => {
      const snapshot = room.getSnapshot();
      const local = snapshot.local;
      if (local === null || local.microphone.muted || capture?.allows(local.identity) === false) {
        return;
      }
      // A browser permission or device request may settle after cancellation. The feed
      // releases a late track itself; saving and a later start need not wait for it.
      await Promise.race([microphone.sync(snapshot, true, false), drained]);
    },
    startEncoder: () => {
      if (ended || capture?.signal.aborted) throw new Error("Recording was canceled");
      recorder.start(RECORDER_TIMESLICE_MS);
      started = true;
      startupTimer = setTimeout(() => settleStart(false), ENCODER_START_TIMEOUT_MS);
      // Keep feeding the canvas while the encoder is pending. Live sources still wait
      // for startCapture, after the room announcement succeeds.
      clock = startFrameClock(COMPOSITE_FPS, drawFrame);
      drawFrame();
      void mixer.resume();
      return encoderStarted;
    },
    startCapture: () => {
      if (!started || ended || recorder.state !== "recording" || capture?.signal.aborted)
        throw new Error("Encoder is unavailable");
      unsubscribeRoom = room.subscribe(syncRoom);
      unsubscribeConsent = capture?.subscribe(syncRoom);
      captureStartedAt = performance.now();
      syncRoom();
    },
    finish: () => {
      if (ended) return drained;
      ended = true;
      settleStart(false);
      clock?.stop();
      unsubscribeRoom?.();
      unsubscribeConsent?.();
      microphone.dispose();
      bindings.dispose();
      mixer.keepOnly(new Set());
      try {
        if (started && !outputClosed) {
          drainTimer = setTimeout(() => {
            outputClosed = true;
            options.onError();
            resolveDrained();
          }, ENCODER_DRAIN_TIMEOUT_MS);
        }
        if (recorder.state !== "inactive") recorder.stop();
        if (!started) resolveDrained();
      } catch {
        clearTimeout(drainTimer);
        outputClosed = true;
        options.onError();
        resolveDrained();
      } finally {
        // The mixer owns only its destination track. Input tracks belong to the meeting.
        for (const track of videoTracks) track.stop();
        void mixer.close();
      }
      return drained;
    },
    videoProgress: sourceProgress.evidence,
  };
}
