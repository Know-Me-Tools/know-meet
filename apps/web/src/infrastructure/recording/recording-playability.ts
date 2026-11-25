// TJ-ARCH-MOB-001 compliant

import { createVideoSampler, decodedFramesDiffer, type VideoProgress } from "./video-progress";
import { readWebmCoverage, type WebmCoverage } from "./webm-track-coverage";

const FRAME_DECODE_TIMEOUT_MS = 800;
const VIDEO_PROGRESS_TIMEOUT_MS = 3000;
const TRACK_TAIL_TOLERANCE_MS = 200;

/** A saved recording contains a real picture only if the browser can draw a decoded frame. */
function hasRecordingVideoFrame(video: HTMLVideoElement): boolean {
  if (video.videoWidth === 0 || video.videoHeight === 0) return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (context === null) return false;

  try {
    // A header or an empty image leaves the initially transparent pixel untouched.
    context.drawImage(video, 0, 0, 1, 1);
    return (context.getImageData(0, 0, 1, 1).data[3] ?? 0) > 0;
  } catch {
    return false;
  }
}

function waitForDecodedFrame(video: HTMLVideoElement, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (decoded: boolean): void => {
      clearTimeout(timer);
      video.removeEventListener("loadeddata", receive);
      video.removeEventListener("error", fail);
      resolve(decoded);
    };
    const fail = (): void => finish(false);
    const receive = (): void => finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    const timer = setTimeout(fail, FRAME_DECODE_TIMEOUT_MS);
    video.addEventListener("loadeddata", receive);
    video.addEventListener("error", fail);
    try {
      video.src = url;
    } catch {
      fail();
    }
  });
}

function hasExpectedVideoProgress(
  video: HTMLVideoElement,
  bounds: NonNullable<WebmCoverage["video"]>,
  captureMs: number,
  progress: VideoProgress,
): Promise<boolean> {
  const sample = createVideoSampler();
  // Timestamp coverage has already been checked. Align from the last saved frame so
  // the encoder's neutral startup frames do not count as progress in the live picture.
  const end = Math.min(
    bounds.last,
    Number.isFinite(video.duration) ? video.duration * 1000 : Infinity,
  );
  const at = (elapsedMs: number) =>
    Math.max(0, bounds.first, Math.min(end - 40, end - captureMs + elapsedMs)) / 1000;
  const early = at(progress.earlyMs);
  const later = at(progress.laterMs);
  if (later <= early || typeof video.requestVideoFrameCallback !== "function")
    return Promise.resolve(false);

  // MediaRecorder emits live WebM segments without seek cues. Decode only the
  // same bounded prefix that was observed at capture, even for long recordings.
  return new Promise((resolve) => {
    let callback: number | undefined;
    let first: ReturnType<typeof sample> | undefined;
    const finish = (advanced: boolean): void => {
      if (callback === undefined) return;
      clearTimeout(timer);
      video.cancelVideoFrameCallback(callback);
      callback = undefined;
      video.removeEventListener("error", fail);
      video.removeEventListener("ended", fail);
      video.pause();
      resolve(advanced);
    };
    const fail = (): void => finish(false);
    const observe: VideoFrameRequestCallback = (_, { mediaTime }) => {
      if (callback === undefined) return;
      if (first === undefined && mediaTime >= early) first = sample(video);
      if (mediaTime >= later) {
        const last = sample(video);
        finish(
          first !== undefined &&
            first !== null &&
            last !== null &&
            decodedFramesDiffer(first, last),
        );
        return;
      }
      callback = video.requestVideoFrameCallback(observe);
    };
    const timer = setTimeout(fail, VIDEO_PROGRESS_TIMEOUT_MS);
    video.addEventListener("error", fail);
    video.addEventListener("ended", fail);
    callback = video.requestVideoFrameCallback(observe);
    void video.play().catch(fail);
  });
}

function coversCapturedInterval(coverage: WebmCoverage, captureMs: number | undefined): boolean {
  const { audio, video } = coverage;
  if (video === null) return false;
  if (captureMs !== undefined && video.last - video.first + TRACK_TAIL_TOLERANCE_MS < captureMs) {
    return false;
  }
  if (!coverage.audioExpected) return true;
  if (audio === null) return false;

  const startGap = Math.abs(audio.first - video.first);
  const endGap = Math.abs(audio.last - video.last);
  const audioCoversInterval =
    captureMs === undefined || audio.last - audio.first + TRACK_TAIL_TOLERANCE_MS >= captureMs;
  return audioCoversInterval && Math.max(startGap, endGap) <= TRACK_TAIL_TOLERANCE_MS;
}

export async function assessRecordingMedia(
  file: Blob,
  mimeType: string,
  captureMs?: number,
  progress?: VideoProgress,
): Promise<"playable" | "partial" | "unusable"> {
  if (file.size === 0) return "unusable";
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const url = URL.createObjectURL(file.slice(0, file.size, mimeType));
  try {
    const loaded = await waitForDecodedFrame(video, url);
    if (!loaded || !hasRecordingVideoFrame(video)) return "unusable";
    if (!mimeType.startsWith("video/webm")) return "playable";

    const coverage = await readWebmCoverage(file);
    if (
      coverage === null ||
      coverage.video === null ||
      !coversCapturedInterval(coverage, captureMs)
    ) {
      return "partial";
    }
    if (
      progress !== undefined &&
      captureMs !== undefined &&
      !(await hasExpectedVideoProgress(video, coverage.video, captureMs, progress))
    ) {
      return "partial";
    }
    return "playable";
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
