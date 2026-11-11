/**
 * SSE framing. Valid events use the @ag-ui/encoder 1.0.4 format
 * (`data: <json>\n\n`) with an added `id: <n>` line for replay.
 */
import type { WireItem } from "../domain/scenario.ts";

export function encodeFrame(item: WireItem, id: number): string {
  if (item.kind === "raw-sse") return item.rawSse;
  return `id: ${id}\ndata: ${JSON.stringify(item.event)}\n\n`;
}

export interface SseFrame {
  readonly id: string | null;
  /** Joined data lines, or null for comment-only / empty frames. */
  readonly data: string | null;
}

/** Incremental SSE parser (WHATWG event-stream rules, minus retry/event fields). */
export class SseParser {
  private buffer = "";
  private dataLines: string[] = [];
  private id: string | null = null;

  push(chunk: string): SseFrame[] {
    this.buffer += chunk;
    const frames: SseFrame[] = [];
    let newline = this.buffer.search(/\r\n|\n|\r/);
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline);
      const width = this.buffer.startsWith("\r\n", newline) ? 2 : 1;
      this.buffer = this.buffer.slice(newline + width);
      const frame = this.line(line);
      if (frame !== null) frames.push(frame);
      newline = this.buffer.search(/\r\n|\n|\r/);
    }
    return frames;
  }

  private line(line: string): SseFrame | null {
    if (line === "") {
      const frame: SseFrame = { id: this.id, data: this.dataLines.length > 0 ? this.dataLines.join("\n") : null };
      this.dataLines = [];
      return frame;
    }
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "data") this.dataLines.push(value);
    if (field === "id") this.id = value;
    return null;
  }
}

/** Parses every frame of a complete SSE text. */
export function parseSse(text: string): SseFrame[] {
  return new SseParser().push(text);
}
