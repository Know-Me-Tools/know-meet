/**
 * A small in-memory tar reader for `docker image save` output and the layer tars inside
 * it. It reads ustar, pax (`x`, `g`) and GNU long names (`L`). Nothing touches the disk.
 */

const BLOCK = 512;
/** One entry larger than this is refused rather than held in memory. */
export const MAX_ENTRY_BYTES = 1024 * 1024 * 1024;

export class TarError extends Error {
  constructor() {
    super("tar archive is not readable");
    this.name = "TarError";
  }
}

export interface TarEntry {
  readonly name: string;
  readonly data: Buffer;
}

/** Chunks held as received; `take` copies only the bytes it returns. */
class ByteQueue {
  private chunks: Buffer[] = [];
  length = 0;

  push(chunk: Buffer): void {
    if (chunk.length === 0) return;
    this.chunks.push(chunk);
    this.length += chunk.length;
  }

  clear(): void {
    this.chunks = [];
    this.length = 0;
  }

  take(count: number): Buffer {
    if (count > this.length) throw new TarError();
    const first = this.chunks[0];
    if (first !== undefined && first.length >= count) {
      const out = first.subarray(0, count);
      if (first.length === count) this.chunks.shift();
      else this.chunks[0] = first.subarray(count);
      this.length -= count;
      return out;
    }
    const parts: Buffer[] = [];
    let remaining = count;
    while (remaining > 0) {
      const chunk = this.chunks[0];
      if (chunk === undefined) throw new TarError();
      if (chunk.length <= remaining) {
        parts.push(chunk);
        remaining -= chunk.length;
        this.chunks.shift();
      } else {
        parts.push(chunk.subarray(0, remaining));
        this.chunks[0] = chunk.subarray(remaining);
        remaining = 0;
      }
    }
    this.length -= count;
    return Buffer.concat(parts, count);
  }
}

interface Header {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

function cString(buffer: Buffer, start: number, end: number): string {
  const slice = buffer.subarray(start, end);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul === -1 ? slice.length : nul).toString("utf8");
}

function parseNumber(field: Buffer): number {
  const first = field[0] ?? 0;
  if ((first & 0x80) !== 0) {
    // GNU base-256: big-endian, the top bit of the first byte marks the form.
    let value = first & 0x7f;
    for (let i = 1; i < field.length; i += 1) value = value * 256 + (field[i] ?? 0);
    if (!Number.isSafeInteger(value)) throw new TarError();
    return value;
  }
  const text = field.toString("latin1").replace(/\0.*$/s, "").trim();
  if (text === "") return 0;
  if (!/^[0-7]+$/.test(text)) throw new TarError();
  return Number.parseInt(text, 8);
}

function verifyChecksum(block: Buffer): void {
  const stored = parseNumber(block.subarray(148, 156));
  let sum = 0;
  for (let i = 0; i < BLOCK; i += 1) {
    sum += i >= 148 && i < 156 ? 0x20 : (block[i] ?? 0);
  }
  if (sum !== stored) throw new TarError();
}

function parseHeader(block: Buffer): Header {
  if (block.toString("latin1", 257, 262) !== "ustar") throw new TarError();
  verifyChecksum(block);
  const posix = block.toString("latin1", 263, 265) === "00";
  const prefix = posix ? cString(block, 345, 500) : "";
  const base = cString(block, 0, 100);
  return {
    name: prefix === "" ? base : `${prefix}/${base}`,
    size: parseNumber(block.subarray(124, 136)),
    type: String.fromCharCode(block[156] ?? 0),
  };
}

/** Reads `path` and `size` from pax records: `<length> <key>=<value>\n`. */
function parsePax(data: Buffer): { path?: string; size?: number } {
  const out: { path?: string; size?: number } = {};
  let offset = 0;
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset);
    if (space === -1) break;
    const length = Number.parseInt(data.toString("latin1", offset, space), 10);
    if (!Number.isInteger(length) || length <= space - offset + 1) throw new TarError();
    const record = data.toString("utf8", space + 1, offset + length - 1);
    const eq = record.indexOf("=");
    if (eq > 0) {
      const key = record.slice(0, eq);
      const value = record.slice(eq + 1);
      if (key === "path") out.path = value;
      if (key === "size") {
        const size = Number.parseInt(value, 10);
        if (!Number.isSafeInteger(size) || size < 0) throw new TarError();
        out.size = size;
      }
    }
    offset += length;
  }
  return out;
}

interface Pending {
  readonly header: Header;
  readonly size: number;
  readonly path: string | undefined;
}

/** Feeds chunks in, gets completed regular files out. */
export class TarParser {
  private readonly queue = new ByteQueue();
  private pending: Pending | null = null;
  private nextPath: string | undefined;
  private nextSize: number | undefined;
  private ended = false;

  push(chunk: Buffer): TarEntry[] {
    if (this.ended) return [];
    this.queue.push(chunk);
    const out: TarEntry[] = [];
    while (!this.ended) {
      const pending = this.pending;
      if (pending === null) {
        if (this.queue.length < BLOCK) break;
        this.startEntry(this.queue.take(BLOCK));
        continue;
      }
      const padded = Math.ceil(pending.size / BLOCK) * BLOCK;
      if (this.queue.length < padded) break;
      const data = this.queue.take(padded).subarray(0, pending.size);
      this.pending = null;
      const entry = this.finishEntry(pending, data);
      if (entry !== null) out.push(entry);
    }
    if (this.ended) this.queue.clear();
    return out;
  }

  /** Throws when the archive stops in the middle of an entry or a header. */
  finish(): void {
    if (this.pending !== null || (!this.ended && this.queue.length > 0)) throw new TarError();
  }

  private startEntry(block: Buffer): void {
    if (block.every((byte) => byte === 0)) {
      this.ended = true;
      return;
    }
    const header = parseHeader(block);
    const meta = "xgLK".includes(header.type);
    const size = meta ? header.size : (this.nextSize ?? header.size);
    if (size > MAX_ENTRY_BYTES) throw new TarError();
    this.pending = { header, size, path: this.nextPath };
  }

  private finishEntry(pending: Pending, data: Buffer): TarEntry | null {
    const { type } = pending.header;
    if (type === "x") {
      const pax = parsePax(data);
      this.nextPath = pax.path ?? this.nextPath;
      this.nextSize = pax.size ?? this.nextSize;
      return null;
    }
    if (type === "L") {
      this.nextPath = cString(data, 0, data.length);
      return null;
    }
    if (type === "g" || type === "K") return null;
    this.nextPath = undefined;
    this.nextSize = undefined;
    const regular = type === "0" || type === "\0" || type === "7";
    if (!regular) return null;
    return { name: pending.path ?? pending.header.name, data };
  }
}

export async function* readTarStream(
  source: AsyncIterable<Buffer | string>,
): AsyncGenerator<TarEntry> {
  const parser = new TarParser();
  for await (const chunk of source) {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk, "latin1") : chunk;
    for (const entry of parser.push(bytes)) yield entry;
  }
  parser.finish();
}

export function readTarBuffer(buffer: Buffer): TarEntry[] {
  const parser = new TarParser();
  const entries = parser.push(buffer);
  parser.finish();
  return entries;
}

/** True when the bytes start a ustar header. */
export function isTar(data: Buffer): boolean {
  return data.length >= BLOCK && data.toString("latin1", 257, 262) === "ustar";
}
