// TJ-ARCH-MOB-001 compliant

import { computeGridLayout, type TileRect } from "./grid-layout";
import type { BoundMedia } from "./media-bindings";

/** Colours and font for what is drawn into the recording, read from the design tokens. */
export interface CompositePalette {
  readonly background: string;
  readonly tile: string;
  readonly text: string;
  readonly tagBackground: string;
  readonly font: string;
}

const GAP = 12;
const TAG_HEIGHT = 28;
const TAG_PADDING = 10;

/**
 * The media tokens are the same in both themes (video sits on black), so the recording
 * looks the same whatever theme the recorder uses. Missing tokens fall back to the
 * browser's own system colours, never to colours chosen here.
 */
export function readCompositePalette(root: HTMLElement): CompositePalette {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string): string => {
    const value = style.getPropertyValue(name).trim();
    return value === "" ? fallback : value;
  };
  return {
    background: read("--media-bg", "Canvas"),
    tile: read("--media-tag-bg", "Canvas"),
    text: read("--on-media", "CanvasText"),
    tagBackground: read("--media-tag-bg", "Canvas"),
    font: read("--font-body", "sans-serif"),
  };
}

export interface FrameCompositor {
  /** Draws the current grid of the given tiles. Call once per frame. */
  draw(tiles: readonly BoundMedia[]): void;
}

function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part !== "");
  const letters = parts.slice(0, 2).map((part) => part.slice(0, 1).toUpperCase());
  return letters.join("");
}

function hasFrame(element: HTMLVideoElement | HTMLAudioElement): element is HTMLVideoElement {
  return (
    element instanceof HTMLVideoElement &&
    element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    element.videoWidth > 0 &&
    element.videoHeight > 0
  );
}

/** A camera fills its tile (cropped); a shared screen is shown whole (letterboxed). */
function fit(video: HTMLVideoElement, rect: TileRect, cover: boolean): TileRect {
  const scale = cover
    ? Math.max(rect.width / video.videoWidth, rect.height / video.videoHeight)
    : Math.min(rect.width / video.videoWidth, rect.height / video.videoHeight);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/**
 * Draws the recording's frames (decision D4): an equal grid of the room's video tiles on
 * black, screen shares as one more tile, each with the participant's name. A participant
 * without video shows their initials. Nothing here is a control; it is picture only.
 */
export function createFrameCompositor(
  canvas: HTMLCanvasElement,
  palette: CompositePalette,
): FrameCompositor {
  const context = canvas.getContext("2d", { alpha: false });
  if (context === null) throw new Error("A 2D canvas context is not available");
  const ctx = context;

  function drawPlaceholder(tile: BoundMedia, rect: TileRect): void {
    ctx.fillStyle = palette.tile;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = palette.text;
    ctx.font = `600 ${Math.round(rect.height / 4)}px ${palette.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(tile.label), rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  function drawTag(label: string, rect: TileRect): void {
    if (label === "") return;
    ctx.font = `500 14px ${palette.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const width = Math.min(
      rect.width - 2 * TAG_PADDING,
      ctx.measureText(label).width + 2 * TAG_PADDING,
    );
    const x = rect.x + TAG_PADDING;
    const y = rect.y + rect.height - TAG_HEIGHT - TAG_PADDING;
    ctx.fillStyle = palette.tagBackground;
    ctx.fillRect(x, y, width, TAG_HEIGHT);
    ctx.fillStyle = palette.text;
    ctx.fillText(label, x + TAG_PADDING, y + TAG_HEIGHT / 2, width - 2 * TAG_PADDING);
  }

  function drawTile(tile: BoundMedia, rect: TileRect): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    if (hasFrame(tile.element)) {
      ctx.fillStyle = palette.background;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      const target = fit(tile.element, rect, tile.kind === "camera");
      ctx.drawImage(tile.element, target.x, target.y, target.width, target.height);
    } else {
      drawPlaceholder(tile, rect);
    }
    drawTag(tile.label, rect);
    ctx.restore();
  }

  return {
    draw: (tiles) => {
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const videoTiles = tiles.filter((tile) => tile.medium === "video");
      const rects = computeGridLayout(videoTiles.length, canvas.width, canvas.height, GAP);
      videoTiles.forEach((tile, index) => {
        const rect = rects[index];
        if (rect !== undefined) drawTile(tile, rect);
      });
    },
  };
}
