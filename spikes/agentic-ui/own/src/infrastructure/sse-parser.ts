/**
 * Incremental Server-Sent Events parser (WHATWG event-stream format): splits
 * on CR, LF or CRLF, joins multi-line `data:`, records `id:`, ignores
 * comments and unknown fields. Feed decoded text in any chunking.
 */

export interface SseFrame {
  readonly id: string | null;
  readonly event: string | null;
  readonly data: string;
}

export class SseParser {
  private buffer = "";
  private data: string[] = [];
  private id: string | null = null;
  private event: string | null = null;
  private pendingCr = false;

  push(chunk: string): SseFrame[] {
    let text = chunk;
    if (this.pendingCr && text.startsWith("\n")) text = text.slice(1);
    this.pendingCr = false;
    this.buffer += text;
    const frames: SseFrame[] = [];
    let start = 0;
    for (let i = 0; i < this.buffer.length; i += 1) {
      const ch = this.buffer[i];
      if (ch !== "\n" && ch !== "\r") continue;
      const line = this.buffer.slice(start, i);
      if (ch === "\r") {
        if (i + 1 === this.buffer.length) this.pendingCr = true;
        else if (this.buffer[i + 1] === "\n") i += 1;
      }
      start = i + 1;
      const frame = this.line(line);
      if (frame !== null) frames.push(frame);
    }
    this.buffer = this.buffer.slice(start);
    return frames;
  }

  private line(line: string): SseFrame | null {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") this.data.push(value);
    else if (field === "id" && !value.includes("\0")) this.id = value;
    else if (field === "event") this.event = value;
    return null;
  }

  private dispatch(): SseFrame | null {
    if (this.data.length === 0) {
      this.event = null;
      return null;
    }
    const frame: SseFrame = { id: this.id, event: this.event, data: this.data.join("\n") };
    this.data = [];
    this.event = null;
    return frame;
  }
}
