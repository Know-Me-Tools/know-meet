import type { LocalTranscriptionFence, TranscriptionLease } from "@know-meet/domain";
import { LOCAL_SPEECH_RATE, MAX_SPEECH_CHUNK_MS, type SpeechChunk } from "./speech-ingress";

const WORKLET = "/capabilities/local-speech/transcription-pcm-worklet.js";
const MAX_SAMPLES = (LOCAL_SPEECH_RATE * MAX_SPEECH_CHUNK_MS) / 1_000;
const PROCESSOR = "know-meet-local-speech-pcm";

interface CaptureTrackOptions {
  readonly context: AudioContext;
  readonly track: MediaStreamTrack;
  readonly fence: LocalTranscriptionFence;
  readonly lease: TranscriptionLease;
  /** Milliseconds since this meeting's monotonic start at cue time. */
  readonly meetingTimeMs: () => number;
  readonly onFrame: (lease: TranscriptionLease, frame: SpeechChunk) => void;
  readonly onGap: (
    startMs: number,
    endMs: number,
    reason: "capturing-overload" | "consent-cut",
  ) => void;
  readonly onCut: () => void;
  readonly onUnavailable: () => void;
}

function readSampleInterval(value: unknown): { start: number; end: number } | null {
  if (typeof value !== "object" || value === null || !("start" in value) || !("end" in value))
    return null;
  const { start, end } = value;
  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end <= start
  )
    return null;
  return { start, end };
}

/**
 * A dedicated tap of an already existing, individually authorized audio
 * track. Never request a new microphone, use the recorder or mix the room.
 * Caller supplies an AudioContext obtained from the explicit local feature.
 */
export async function bindLocalTranscriptionTrack(
  options: CaptureTrackOptions,
): Promise<(() => void) | null> {
  const { context, track, fence, lease } = options;
  const valid = () =>
    fence.isCurrent(lease) && track.kind === "audio" && track.readyState === "live";
  if (!valid()) return null;
  if (context.sampleRate !== LOCAL_SPEECH_RATE || !context.audioWorklet) {
    options.onUnavailable();
    return null;
  }

  let input: MediaStreamAudioSourceNode | null = null;
  let processor: AudioWorkletNode | null = null;
  let silentOutput: GainNode | null = null;
  let markUncoveredTail: (() => void) | null = null;
  let closed = false;
  const onTrackEnded = () => {
    teardown();
    options.onCut();
  };
  function teardown(): void {
    if (closed) return;
    closed = true;
    track.removeEventListener("ended", onTrackEnded);
    input?.disconnect();
    processor?.disconnect();
    silentOutput?.disconnect();
    if (processor !== null) {
      processor.onprocessorerror = null;
      processor.port.onmessage = null;
      processor.port.close();
    }
    markUncoveredTail?.();
    // Don't stop the original MediaStreamTrack or change meeting audio.
  }

  try {
    // The fixed same-origin URL is only read after the exact lease exists.
    await context.audioWorklet.addModule(WORKLET);
    if (!valid()) return null;
    if (context.state !== "running") {
      let endWait: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          context.resume(),
          new Promise<never>((_, reject) => {
            endWait = setTimeout(() => reject(new Error("Audio permission unavailable")), 900);
          }),
        ]);
      } finally {
        if (endWait !== undefined) clearTimeout(endWait);
      }
    }
    if (!valid()) return null;
    const startedAt = Math.floor(options.meetingTimeMs());
    if (!Number.isSafeInteger(startedAt) || startedAt < 0) throw new Error("invalid meeting clock");
    input = context.createMediaStreamSource(new MediaStream([track]));
    processor = new AudioWorkletNode(context, PROCESSOR, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { samplesPerChunk: MAX_SAMPLES },
    });
    silentOutput = context.createGain();
    silentOutput.gain.value = 0;
    const port = processor.port;
    const toMilliseconds = (samples: number) => (samples * 1_000) / LOCAL_SPEECH_RATE;
    let accountedThrough = 0;
    port.onmessage = (event: MessageEvent<unknown>) => {
      const value = event.data;
      if (typeof value !== "object" || value === null) return;
      const pcm = "pcm" in value && value.pcm instanceof Float32Array ? value.pcm : null;
      try {
        if (closed) return;
        if (!valid()) {
          teardown();
          options.onCut();
          return;
        }
        if ("gap" in value || "silence" in value) {
          const silence = "silence" in value;
          const interval = readSampleInterval(silence ? value.silence : value.gap);
          if (interval === null) return;
          accountedThrough = Math.max(accountedThrough, interval.end);
          if (!silence) {
            options.onGap(
              startedAt + Math.floor(toMilliseconds(interval.start)),
              startedAt + Math.ceil(toMilliseconds(interval.end)),
              "capturing-overload",
            );
          }
          return;
        }
        if (
          !("offset" in value) ||
          typeof value.offset !== "number" ||
          !Number.isSafeInteger(value.offset) ||
          value.offset < 0 ||
          pcm === null ||
          pcm.length === 0 ||
          pcm.length > MAX_SAMPLES
        )
          return;
        accountedThrough = Math.max(accountedThrough, value.offset + pcm.length);
        options.onFrame(lease, {
          startMs: startedAt + Math.floor(toMilliseconds(value.offset)),
          pcm,
        });
      } finally {
        pcm?.fill(0);
        if (!closed && ("pcm" in value || "silence" in value)) port.postMessage("ack");
      }
    };
    processor.onprocessorerror = () => {
      teardown();
      options.onUnavailable();
    };
    track.addEventListener("ended", onTrackEnded, { once: true });
    if (!valid()) {
      teardown();
      return null;
    }
    input.connect(processor);
    const audioStartedAt = context.currentTime;
    processor.connect(silentOutput).connect(context.destination);
    markUncoveredTail = () => {
      const coveredUntil = startedAt + Math.floor(toMilliseconds(accountedThrough));
      const cutAt = Math.min(
        Math.floor(options.meetingTimeMs()),
        startedAt + Math.floor((context.currentTime - audioStartedAt) * 1_000),
      );
      // An open window was never transferred. Record only its missing time range.
      if (cutAt > coveredUntil) options.onGap(coveredUntil, cutAt, "consent-cut");
    };
    return teardown;
  } catch {
    teardown();
    if (valid()) options.onUnavailable();
    return null;
  }
}
