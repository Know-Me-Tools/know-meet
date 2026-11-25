import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { AUDIO_HZ, type MarkerId, VIDEO_COLORS } from "./rc-privacy-media.ts";
import { RECORDING } from "./wc-test-ids.ts";

const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";
const WIDTH = 192;
const HEIGHT = 108;
const AUDIO_RATE = 16_000;
const VIDEO_FRAME_BYTES = WIDTH * HEIGHT * 3;
const MARKERS = Object.keys(VIDEO_COLORS) as MarkerId[];
const exec = promisify(execFile);

interface MarkerDetection {
  readonly id: MarkerId;
  readonly index: number;
  readonly sequence?: number;
  readonly amplitude?: number;
  readonly confirmationAmplitude?: number;
}

export interface DecodedMarkers {
  readonly video: Readonly<Record<MarkerId, number>>;
  readonly videoProgress: Readonly<Record<MarkerId, number>>;
  readonly audio: Readonly<Record<MarkerId, number>>;
  readonly audioQuantum: Readonly<Record<MarkerId, number>>;
  readonly videoFrames: readonly MarkerDetection[];
  readonly audioQuanta: readonly MarkerDetection[];
  readonly videoEndMs: number;
  readonly audioEndMs: number;
}

function markerCounts(): Record<MarkerId, number> {
  return { a0: 0, a1: 0, b0: 0, b1: 0, c0: 0, c1: 0, share0: 0, share1: 0 };
}

async function run(command: string, args: readonly string[]): Promise<Buffer> {
  try {
    const { stdout } = await exec(command, args, {
      encoding: "buffer",
      maxBuffer: 180 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `BLOCKED: independent decoder unavailable or could not decode fixture bytes\n${message}`,
    );
  }
}

function sampleVideo(bytes: Buffer): {
  frames: MarkerDetection[];
  progress: Record<MarkerId, number>;
} {
  const frames: MarkerDetection[] = [];
  const patterns = new Map(MARKERS.map((id) => [id, new Set<number>()]));
  for (let offset = 0; offset + VIDEO_FRAME_BYTES <= bytes.length; offset += VIDEO_FRAME_BYTES) {
    const areas = new Map<
      MarkerId,
      { count: number; left: number; right: number; top: number; bottom: number }
    >();
    for (let y = 0; y < HEIGHT; y += 2) {
      for (let x = 0; x < WIDTH; x += 2) {
        const pixel = offset + (y * WIDTH + x) * 3;
        let best = 85;
        let match: MarkerId | undefined;
        for (const id of MARKERS) {
          const [r, g, b] = VIDEO_COLORS[id];
          const distance =
            Math.abs((bytes[pixel] ?? 0) - r) +
            Math.abs((bytes[pixel + 1] ?? 0) - g) +
            Math.abs((bytes[pixel + 2] ?? 0) - b);
          if (distance < best) {
            match = id;
            best = distance;
          }
        }
        if (match === undefined) continue;
        const area = areas.get(match);
        if (area === undefined)
          areas.set(match, { count: 1, left: x, right: x, top: y, bottom: y });
        else {
          area.count += 1;
          area.left = Math.min(area.left, x);
          area.right = Math.max(area.right, x);
          area.top = Math.min(area.top, y);
          area.bottom = Math.max(area.bottom, y);
        }
      }
    }
    for (const [id, { count, left, right, top, bottom }] of areas) {
      if (count < 100) continue;
      const y = Math.round((top + bottom) / 2);
      let phaseBits = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const x = Math.round(left + (right - left) * (0.28125 + bit / 16));
        const pixel = offset + (y * WIDTH + x) * 3;
        if (
          (bytes[pixel] ?? 0) > 185 &&
          (bytes[pixel + 1] ?? 0) > 185 &&
          (bytes[pixel + 2] ?? 0) > 185
        ) {
          phaseBits |= 1 << bit;
        }
      }
      patterns.get(id)?.add(phaseBits);
      frames.push({ id, index: offset / VIDEO_FRAME_BYTES, sequence: phaseBits });
    }
  }
  const progress = markerCounts();
  for (const [id, samples] of patterns) progress[id] = samples.size;
  return { frames, progress };
}

function amplitude(bytes: Buffer, start: number, samples: number, frequency: number): number {
  const radians = (2 * Math.PI * frequency) / AUDIO_RATE;
  const coefficient = 2 * Math.cos(radians);
  let previous = 0;
  let before = 0;
  for (let index = start; index < start + samples; index += 1) {
    const weight = 0.5 - 0.5 * Math.cos((2 * Math.PI * (index - start)) / (samples - 1));
    const next = (bytes.readInt16LE(index * 2) * weight) / 32768 + coefficient * previous - before;
    before = previous;
    previous = next;
  }
  return (
    (4 * Math.sqrt(Math.max(0, previous ** 2 + before ** 2 - coefficient * previous * before))) /
    samples
  );
}

function isTone(
  bytes: Buffer,
  start: number,
  samples: number,
  hz: number,
  signal: number,
): boolean {
  if (signal < 0.012) return false;
  const side = Math.max(
    amplitude(bytes, start, samples, hz - 45),
    amplitude(bytes, start, samples, hz + 45),
  );
  return signal > side * 1.55;
}

// Overlap quanta so the detector can catch an onset near either side of a window.
// The encoded negative control demonstrates its measured minimum on the pinned host.
function sampleAudio(
  bytes: Buffer,
  milliseconds: number,
  stepMs = milliseconds,
): MarkerDetection[] {
  const detections: MarkerDetection[] = [];
  const samples = (AUDIO_RATE * milliseconds) / 1000;
  const step = (AUDIO_RATE * stepMs) / 1000;
  for (let start = 0; start + samples <= bytes.length / 2; start += step) {
    for (const id of MARKERS) {
      const [hz, confirmationHz] = AUDIO_HZ[id];
      const signal = amplitude(bytes, start, samples, hz);
      if (!isTone(bytes, start, samples, hz, signal)) continue;
      const confirmation = amplitude(bytes, start, samples, confirmationHz);
      if (!isTone(bytes, start, samples, confirmationHz, confirmation)) continue;
      detections.push({
        id,
        index: start / (AUDIO_RATE / 1000),
        amplitude: signal,
        confirmationAmplitude: confirmation,
      });
    }
  }
  return detections;
}

function counts(detections: readonly MarkerDetection[]): Record<MarkerId, number> {
  const result = markerCounts();
  for (const { id } of detections) result[id] += 1;
  return result;
}

async function packetEnd(path: string, selector: string): Promise<number> {
  const output = await run(FFPROBE, [
    "-v",
    "error",
    "-select_streams",
    selector,
    "-show_packets",
    "-show_entries",
    "packet=pts_time,duration_time",
    "-of",
    "csv=p=0",
    path,
  ]);
  const times = output
    .toString()
    .trim()
    .split("\n")
    .map((line) => {
      const [start, duration] = line.split(",");
      return (Number(start) + (Number(duration) || 0)) * 1000;
    });
  return Math.max(0, ...times.filter(Number.isFinite));
}

async function decode(path: string): Promise<DecodedMarkers> {
  const [pixels, pcm, videoEndMs, audioEndMs] = await Promise.all([
    run(FFMPEG, [
      "-v",
      "error",
      "-i",
      path,
      "-map",
      "0:v:0",
      "-vf",
      `scale=${WIDTH}:${HEIGHT}`,
      "-pix_fmt",
      "rgb24",
      "-fps_mode",
      "passthrough",
      "-f",
      "rawvideo",
      "pipe:1",
    ]),
    run(FFMPEG, [
      "-v",
      "error",
      "-i",
      path,
      "-map",
      "0:a:0",
      "-ac",
      "1",
      "-ar",
      String(AUDIO_RATE),
      "-f",
      "s16le",
      "pipe:1",
    ]),
    packetEnd(path, "v:0"),
    packetEnd(path, "a:0"),
  ]);
  const { frames, progress } = sampleVideo(pixels);
  const audioQuanta = sampleAudio(pcm, 20, 10);
  return {
    video: counts(frames),
    videoProgress: progress,
    audio: counts(sampleAudio(pcm, 200)),
    audioQuantum: counts(audioQuanta),
    videoFrames: frames,
    audioQuanta,
    videoEndMs,
    audioEndMs,
  };
}

export async function decodeLibraryRecording(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<DecodedMarkers> {
  if (!new URL(page.url()).hash.startsWith("#recording:")) {
    const item = page.getByTestId(RECORDING.item).first();
    await expect(item, "saved recording is independently ready").toBeVisible({ timeout: 20_000 });
    await item.click();
  }
  const download = page.getByRole("link", { name: "Download", exact: true });
  await expect(download, "download must expose the saved bytes").toBeVisible({ timeout: 20_000 });
  const downloading = page.waitForEvent("download");
  await download.click();
  const path = testInfo.outputPath(`${name}.webm`);
  await (await downloading).saveAs(path);
  return attachDecodedRecording(path, testInfo, name);
}

export async function decodeStoredRecording(
  bytes: Buffer,
  testInfo: TestInfo,
  name: string,
): Promise<DecodedMarkers> {
  const path = testInfo.outputPath(`${name}.webm`);
  await writeFile(path, bytes);
  return attachDecodedRecording(path, testInfo, name);
}

async function attachDecodedRecording(
  path: string,
  testInfo: TestInfo,
  name: string,
): Promise<DecodedMarkers> {
  await testInfo.attach(`${name}.webm`, { path, contentType: "video/webm" });
  const decoded = await decode(path);
  await attachJson(testInfo, `${name}-decoded.json`, decoded);
  return decoded;
}

export async function encodedControl(
  testInfo: TestInfo,
  mode: "clean" | "frame" | "audio",
  forbiddenAudio: "a1" | "c1" = "c1",
): Promise<DecodedMarkers> {
  const name = mode === "audio" && forbiddenAudio === "a1" ? "control-audio-a1" : `control-${mode}`;
  const videoPath = testInfo.outputPath(`${name}.rgb`);
  const audioPath = testInfo.outputPath(`${name}.pcm`);
  const output = testInfo.outputPath(`${name}.webm`);
  const video = Buffer.alloc(24 * VIDEO_FRAME_BYTES);
  for (let index = 0; index < video.length; index += 3) {
    const frame = Math.floor(index / VIDEO_FRAME_BYTES);
    const [r, g, b] = VIDEO_COLORS[mode === "frame" && frame === 12 ? "c1" : "a0"];
    video[index] = r;
    video[index + 1] = g;
    video[index + 2] = b;
  }
  const audio = Buffer.alloc(((AUDIO_RATE * 800) / 1000) * 2);
  const tone = (id: MarkerId, level: number, time: number): number => {
    const [primary, confirmation] = AUDIO_HZ[id];
    return (
      level * Math.sin(2 * Math.PI * primary * time) +
      0.06 * Math.sin(2 * Math.PI * confirmation * time)
    );
  };
  for (let sample = 0; sample < audio.length / 2; sample += 1) {
    const time = sample / AUDIO_RATE;
    // Both eligible sources continue across abrupt level changes like those present
    // in the Stop clip before its single spurious frequency hit.
    const aLevel = time < 0.24 ? 0.19 : 0.13;
    const bLevel = time >= 0.23 && time < 0.26 ? 0.04 : 0.19;
    const mixed = tone("a0", aLevel, time) + tone("b0", bLevel, time);
    const forbidden = mode === "audio" && sample >= 6400 && sample < 6720;
    const value = forbidden ? mixed + tone(forbiddenAudio, 0.18, time) : mixed;
    audio.writeInt16LE(Math.round(value * 32767), sample * 2);
  }
  await Promise.all([writeFile(videoPath, video), writeFile(audioPath, audio)]);
  await run(FFMPEG, [
    "-y",
    "-v",
    "error",
    "-f",
    "rawvideo",
    "-pixel_format",
    "rgb24",
    "-video_size",
    `${WIDTH}x${HEIGHT}`,
    "-framerate",
    "30",
    "-i",
    videoPath,
    "-f",
    "s16le",
    "-ar",
    String(AUDIO_RATE),
    "-ac",
    "1",
    "-i",
    audioPath,
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "libopus",
    output,
  ]);
  const decoded = await decode(output);
  await testInfo.attach(`${name}.webm`, { path: output, contentType: "video/webm" });
  await attachJson(testInfo, `${name}-decoded.json`, decoded);
  return decoded;
}

export async function attachDecoderIdentity(testInfo: TestInfo): Promise<void> {
  const rows = await Promise.all(
    [FFMPEG, FFPROBE].map(async (path) => ({
      path,
      version: (await run(path, ["-version"])).toString().split("\n")[0],
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    })),
  );
  await attachJson(testInfo, "independent-decoder.json", rows);
}
