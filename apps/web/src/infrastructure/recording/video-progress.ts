// TJ-ARCH-MOB-001 compliant

const SAMPLE_WIDTH = 40;
const SAMPLE_HEIGHT = 24;
const SAMPLE_INTERVAL_MS = 100;
const WARMUP_MS = 120;
const SAMPLE_PREFIX_MS = 1400;
const PROGRESS_SPACING_MS = 200;
const SOURCE_PIXEL_DELTA = 24;
const DECODED_PIXEL_DELTA = 14;
const DISTINCT_PIXEL_FRACTION = 0.04;

export interface VideoProgress {
  readonly earlyMs: number;
  readonly laterMs: number;
}

type VideoSample = Uint8ClampedArray;

/** Keep coarse local samples in memory for one recording. Never persist or export them. */
export function createVideoSampler() {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return (source: HTMLCanvasElement | HTMLVideoElement): VideoSample | null => {
    if (context === null) return null;
    try {
      context.drawImage(source, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      return context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
    } catch {
      return null;
    }
  };
}

function distinct(a: VideoSample, b: VideoSample, threshold: number): boolean {
  let changed = 0;
  for (let offset = 0; offset < a.length; offset += 4) {
    const delta = Math.max(
      Math.abs((a[offset] ?? 0) - (b[offset] ?? 0)),
      Math.abs((a[offset + 1] ?? 0) - (b[offset + 1] ?? 0)),
      Math.abs((a[offset + 2] ?? 0) - (b[offset + 2] ?? 0)),
    );
    if (delta >= threshold) changed += 1;
  }
  return changed >= SAMPLE_WIDTH * SAMPLE_HEIGHT * DISTINCT_PIXEL_FRACTION;
}

export function decodedFramesDiffer(a: VideoSample, b: VideoSample): boolean {
  return distinct(a, b, DECODED_PIXEL_DELTA);
}

/** Record two source times in the prefix, which can be decoded without seeking the WebM. */
export function observeVideoProgress(canvas: HTMLCanvasElement) {
  const sample = createVideoSampler();
  let firstFrameMs: number | undefined;
  let lastSampleMs = -Infinity;
  let early: { readonly sample: VideoSample; readonly elapsedMs: number } | undefined;
  let progress: VideoProgress | undefined;

  return {
    observe(elapsedMs: number): void {
      firstFrameMs ??= elapsedMs;
      if (
        elapsedMs > SAMPLE_PREFIX_MS ||
        elapsedMs - firstFrameMs < WARMUP_MS ||
        elapsedMs - lastSampleMs < SAMPLE_INTERVAL_MS
      ) {
        return;
      }
      lastSampleMs = elapsedMs;
      const current = sample(canvas);
      if (current === null) return;
      if (early === undefined) early = { sample: current, elapsedMs };
      if (
        elapsedMs - early.elapsedMs >= PROGRESS_SPACING_MS &&
        distinct(early.sample, current, SOURCE_PIXEL_DELTA)
      ) {
        progress = { earlyMs: early.elapsedMs, laterMs: elapsedMs };
      }
    },
    evidence: () => progress,
  };
}
