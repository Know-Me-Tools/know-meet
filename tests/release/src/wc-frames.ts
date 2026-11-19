/**
 * Frame comparison for WC-4: does a remote participant's rendered video change
 * when a background effect is applied, and return when it is turned off?
 *
 * Frames are read from the <video> element the other participant's browser
 * renders, drawn to a canvas at native size (capped), reduced to luma and kept
 * in the page under a name. Differences are computed in the page, so no pixel
 * array crosses the protocol. Visual quality is NOT measured here: the contract
 * labels it a judgement from screenshots. This only proves the pixels moved.
 */
import type { Locator, Page } from "@playwright/test";

interface FrameStore {
  __kmFrames?: Record<string, Uint8ClampedArray>;
}

export interface FrameInfo {
  readonly width: number;
  readonly height: number;
}

/** Captures the current frame of the <video> under `video` as luma under `key`. */
export async function snapshotFrame(video: Locator, key: string): Promise<FrameInfo> {
  return video.evaluate((element, name) => {
    const el = element as HTMLVideoElement;
    const scale = Math.min(1, 320 / Math.max(1, el.videoWidth));
    const width = Math.max(1, Math.round(el.videoWidth * scale));
    const height = Math.max(1, Math.round(el.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("no 2d canvas context");
    context.drawImage(el, 0, 0, width, height);
    const rgba = context.getImageData(0, 0, width, height).data;
    const luma = new Uint8ClampedArray(width * height);
    for (let i = 0; i < luma.length; i += 1) {
      luma[i] =
        0.299 * (rgba[i * 4] ?? 0) +
        0.587 * (rgba[i * 4 + 1] ?? 0) +
        0.114 * (rgba[i * 4 + 2] ?? 0);
    }
    const store = window as unknown as FrameStore;
    store.__kmFrames = { ...(store.__kmFrames ?? {}), [name]: luma };
    return { width, height };
  }, key);
}

/** Mean absolute luma difference (0 to 255) between two captured frames of the same size. */
export async function frameDifference(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate(
    ([first, second]) => {
      const store = (window as unknown as FrameStore).__kmFrames ?? {};
      const x = store[first as string];
      const y = store[second as string];
      if (x === undefined || y === undefined || x.length !== y.length) return Number.NaN;
      let total = 0;
      for (let i = 0; i < x.length; i += 1) total += Math.abs((x[i] ?? 0) - (y[i] ?? 0));
      return total / x.length;
    },
    [a, b],
  );
}

/** Mean absolute horizontal gradient of a captured frame: falls when the picture is blurred. */
export async function edgeEnergy(page: Page, key: string): Promise<number> {
  return page.evaluate((name) => {
    const frame = (window as unknown as FrameStore).__kmFrames?.[name];
    if (frame === undefined) return Number.NaN;
    let total = 0;
    for (let i = 1; i < frame.length; i += 1)
      total += Math.abs((frame[i] ?? 0) - (frame[i - 1] ?? 0));
    return total / frame.length;
  }, key);
}
