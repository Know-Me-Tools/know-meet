import type {
  LocalTranscriptionFence,
  TranscriptionLease,
  TranscriptionSource,
} from "@know-meet/domain";

export const LOCAL_SPEECH_RATE = 16_000;
export const MAX_SPEECH_CHUNK_MS = 4_000;
const MAX_SAMPLES = (LOCAL_SPEECH_RATE / 1000) * MAX_SPEECH_CHUNK_MS;
const MAX_WAITING_CHUNKS = 2;
const WORKER_DEADLINE_MS = 12_000;
const MAX_SEGMENTS = 16;
const MAX_TEXT_LENGTH = 2_000;

export interface SpeechChunk {
  readonly startMs: number;
  readonly pcm: Float32Array;
}

export interface RelativeSpeechSegment {
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

export interface LocalSpeechEndpoint {
  /** The implementation must be local. A cancellation terminates this endpoint. */
  transcribe(samples: Float32Array, signal: AbortSignal): Promise<unknown>;
  close(): void;
}

export interface SettledLocalSpeech {
  readonly source: TranscriptionSource;
  readonly retention: TranscriptionLease["retention"];
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

type GapReason =
  | "capturing-overload"
  | "inference-unavailable"
  | "alignment-unavailable"
  | "consent-cut";
export interface LocalSpeechSink {
  settle(segment: SettledLocalSpeech): void;
  gap(startMs: number, endMs: number, reason: GapReason): void;
  unavailable(): void;
}

interface AcceptedChunk extends SpeechChunk {
  readonly lease: TranscriptionLease;
  readonly endMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function decode(result: unknown, durationMs: number): readonly RelativeSpeechSegment[] | null {
  if (!Array.isArray(result) || result.length > MAX_SEGMENTS) return null;
  const segments: RelativeSpeechSegment[] = [];
  let previousEnd = 0;
  for (const item of result) {
    if (!isRecord(item)) return null;
    const { startMs, endMs, text } = item;
    if (
      typeof startMs !== "number" ||
      !Number.isFinite(startMs) ||
      typeof endMs !== "number" ||
      !Number.isFinite(endMs) ||
      startMs < previousEnd ||
      endMs <= startMs ||
      endMs > durationMs ||
      typeof text !== "string" ||
      text.length > MAX_TEXT_LENGTH
    )
      return null;
    const spoken = text.trim();
    if (spoken !== "") segments.push({ startMs, endMs, text: spoken });
    previousEnd = endMs;
  }
  return segments;
}

/**
 * Sole main-thread path from an authorized meeting track to local speech.
 * Only one worker request and two waiting chunks can exist. Every queued
 * chunk and late result is checked against an original, unexported lease.
 * Never ask an alternate worker or network service on local failure.
 */
export function createLocalSpeechIngress(
  fence: LocalTranscriptionFence,
  endpoint: LocalSpeechEndpoint,
  sink: LocalSpeechSink,
) {
  const waiting: AcceptedChunk[] = [];
  const controller = new AbortController();
  let active: AcceptedChunk | null = null;
  let closed = false;

  const gap = (chunk: AcceptedChunk, reason: GapReason) =>
    sink.gap(chunk.startMs, chunk.endMs, reason);

  const dispose = (reason: GapReason) => {
    if (closed) return;
    closed = true;
    controller.abort();
    endpoint.close();
    const abandoned = active;
    const queued = waiting.splice(0);
    active = null;
    if (abandoned !== null) gap(abandoned, reason);
    for (const item of queued) {
      item.pcm.fill(0);
      gap(item, reason);
    }
  };

  const fail = () => {
    dispose("inference-unavailable");
    sink.unavailable();
  };

  const run = async (chunk: AcceptedChunk) => {
    const timeout = setTimeout(fail, WORKER_DEADLINE_MS);
    try {
      if (!fence.isCurrent(chunk.lease)) {
        chunk.pcm.fill(0);
        gap(chunk, "consent-cut");
        return;
      }
      const result = await endpoint.transcribe(chunk.pcm, controller.signal);
      if (closed) return;
      if (!fence.isCurrent(chunk.lease)) {
        gap(chunk, "consent-cut");
        return;
      }
      if (isRecord(result) && result.kind === "alignment-gap") {
        gap(chunk, "alignment-unavailable");
        return;
      }
      const accepted = decode(result, chunk.endMs - chunk.startMs);
      if (accepted === null) {
        fail();
        return;
      }
      for (const segment of accepted) {
        // A subscriber can synchronously revoke the lane during settlement.
        if (closed || !fence.isCurrent(chunk.lease)) break;
        sink.settle({
          source: chunk.lease.source,
          retention: chunk.lease.retention,
          startMs: chunk.startMs + segment.startMs,
          endMs: chunk.startMs + segment.endMs,
          text: segment.text,
        });
      }
    } catch {
      if (!closed) fail();
    } finally {
      if (chunk.pcm.byteLength > 0) chunk.pcm.fill(0);
      clearTimeout(timeout);
      if (!closed) {
        active = waiting.shift() ?? null;
        if (active !== null) void run(active);
      }
    }
  };

  return {
    offer(lease: TranscriptionLease, frame: SpeechChunk): boolean {
      if (
        closed ||
        !fence.isCurrent(lease) ||
        frame.pcm.length === 0 ||
        frame.pcm.length > MAX_SAMPLES ||
        !Number.isSafeInteger(frame.startMs) ||
        frame.startMs < 0
      )
        return false;
      const endMs = frame.startMs + (frame.pcm.length * 1000) / LOCAL_SPEECH_RATE;
      if (!Number.isFinite(endMs) || endMs > Number.MAX_SAFE_INTEGER) return false;
      if (active !== null && waiting.length >= MAX_WAITING_CHUNKS) {
        sink.gap(frame.startMs, endMs, "capturing-overload");
        return false;
      }
      const pcm = new Float32Array(frame.pcm);
      const chunk: AcceptedChunk = {
        startMs: frame.startMs,
        endMs,
        pcm,
        lease,
      };
      if (active === null) {
        active = chunk;
        void run(chunk);
      } else {
        waiting.push(chunk);
      }
      return true;
    },
    /** Call in the same turn as a room/consent generation cut, before future ingress. */
    cut(): void {
      dispose("consent-cut");
    },
  };
}
