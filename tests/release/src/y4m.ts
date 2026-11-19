/**
 * A repeatable fake camera picture for WC-4 (Chromium
 * --use-file-for-fake-video-capture). Fine vertical stripes with a flat bright
 * block: a blur flattens the stripes (frame difference and edge energy change a
 * lot), an image background replaces the picture, and with the effect off the
 * stripes come back. Every frame is identical, so any pixel change between
 * captures comes from the effect, not from the source.
 */

export interface Y4mOptions {
  readonly width: number;
  readonly height: number;
  readonly frames: number;
  readonly stripePeriod: number;
}

export const DEFAULT_Y4M: Y4mOptions = { width: 320, height: 240, frames: 10, stripePeriod: 4 };

function lumaPlane(options: Y4mOptions): Buffer {
  const { width, height, stripePeriod } = options;
  const plane = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inBlock =
        x > width / 3 && x < (2 * width) / 3 && y > height / 4 && y < (3 * height) / 4;
      const stripe = Math.floor(x / (stripePeriod / 2)) % 2 === 0;
      plane[y * width + x] = inBlock ? 235 : stripe ? 30 : 200;
    }
  }
  return plane;
}

/** A 4:2:0 YUV4MPEG2 stream: header line, then "FRAME" lines each followed by Y, U and V planes. */
export function buildY4m(options: Y4mOptions = DEFAULT_Y4M): Buffer {
  const { width, height, frames } = options;
  const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`, "ascii");
  const luma = lumaPlane(options);
  const chroma = Buffer.alloc((width / 2) * (height / 2), 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n", "ascii"), luma, chroma, chroma]);
  return Buffer.concat([header, ...Array.from({ length: frames }, () => frame)]);
}
