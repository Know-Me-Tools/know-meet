/**
 * Incremental Server-Sent Events frame parser (id / data / event fields, comments ignored).
 * Own parser instead of @ag-ui/client's: HttpAgent errors the whole run on a non-JSON frame,
 * and it does not expose frame ids, which Last-Event-ID reconnect needs.
 */

export interface SseFrame {
  readonly id: string | null;
  readonly data: string;
}

export class SseFrameParser {
  private buffer = "";

  /** Feeds a decoded chunk; returns every frame it completes. */
  push(chunk: string): SseFrame[] {
    this.buffer += chunk.replace(/\r\n?/g, "\n");
    const frames: SseFrame[] = [];
    let boundary = this.buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const frame = parseBlock(block);
      if (frame !== null) frames.push(frame);
      boundary = this.buffer.indexOf("\n\n");
    }
    return frames;
  }
}

function parseBlock(block: string): SseFrame | null {
  let id: string | null = null;
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line === "" || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const name = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (name === "id") id = value;
    else if (name === "data") data.push(value);
  }
  return data.length === 0 ? null : { id, data: data.join("\n") };
}
