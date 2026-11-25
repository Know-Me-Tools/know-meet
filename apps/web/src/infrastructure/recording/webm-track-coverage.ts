// TJ-ARCH-MOB-001 compliant

// Chromium MediaRecorder's WebM timing elements. Read only headers and timestamps.
// Payloads are skipped, so opening a large local file never allocates it in full.
// See RFC 9559, section 5.1 and section 10.
const SEGMENT = 0x18538067;
const INFO = 0x1549a966;
const TIMESTAMP_SCALE = 0x2ad7b1;
const TRACKS = 0x1654ae6b;
const TRACK_ENTRY = 0xae;
const TRACK_NUMBER = 0xd7;
const TRACK_TYPE = 0x83;
const VIDEO = 1;
const AUDIO = 2;
const CLUSTER = 0x1f43b675;
const TIMESTAMP = 0xe7;
const SIMPLE_BLOCK = 0xa3;
const BLOCK_GROUP = 0xa0;
const BLOCK = 0xa1;
const WINDOW_BYTES = 128 * 1024;
const DEFAULT_SCALE_NS = 1_000_000;

interface VariableInteger {
  readonly bytes: number;
  readonly value: number | null;
}

function variableInteger(view: DataView, offset: number, keepMarker = false): VariableInteger {
  const first = view.getUint8(offset);
  let marker = 128;
  let bytes = 1;
  while (marker > 0 && (first & marker) === 0) {
    marker >>= 1;
    bytes += 1;
  }
  if (marker === 0) throw new RangeError("Invalid WebM integer");
  let value = keepMarker ? first : first ^ marker;
  let unknown = !keepMarker && value === marker - 1;
  for (let index = 1; index < bytes; index += 1) {
    const byte = view.getUint8(offset + index);
    value = value * 256 + byte;
    unknown &&= byte === 255;
  }
  if (!unknown && !Number.isSafeInteger(value)) throw new RangeError("WebM integer too large");
  return { bytes, value: unknown ? null : value };
}

interface Element {
  readonly id: number;
  readonly body: number;
  readonly end: number | null;
}

class WebmReader {
  private initial = 0;
  private cache: DataView<ArrayBuffer> | null = null;

  constructor(private readonly file: Blob) {}

  private async view(offset: number, bytes: number): Promise<DataView<ArrayBuffer>> {
    if (
      this.cache === null ||
      offset < this.initial ||
      offset + bytes > this.initial + this.cache.byteLength
    ) {
      this.initial = offset;
      this.cache = new DataView(await this.file.slice(offset, offset + WINDOW_BYTES).arrayBuffer());
    }
    const start = offset - this.initial;
    return new DataView(this.cache.buffer, start, Math.min(bytes, this.cache.byteLength - start));
  }

  async element(offset: number): Promise<Element> {
    const bytes = await this.view(offset, 12);
    const id = variableInteger(bytes, 0, true);
    const size = variableInteger(bytes, id.bytes);
    if (id.value === null || id.bytes > 4) throw new RangeError("Invalid WebM element ID");
    const body = offset + id.bytes + size.bytes;
    const end = size.value === null ? null : body + size.value;
    if (end !== null && end > this.file.size) throw new RangeError("Truncated WebM element");
    return { id: id.value, body, end };
  }

  async unsigned(element: Element): Promise<number> {
    const bytes = requiredEnd(element) - element.body;
    if (bytes < 1 || bytes > 8) throw new RangeError("Invalid WebM unsigned integer");
    const view = await this.view(element.body, bytes);
    let value = 0;
    for (let index = 0; index < bytes; index += 1) value = value * 256 + view.getUint8(index);
    if (!Number.isSafeInteger(value)) throw new RangeError("WebM unsigned integer too large");
    return value;
  }

  async block(element: Element): Promise<{ readonly track: number; readonly offset: number }> {
    const view = await this.view(element.body, Math.min(10, requiredEnd(element) - element.body));
    const track = variableInteger(view, 0);
    if (track.value === null || view.byteLength <= track.bytes + 3) {
      throw new RangeError("Invalid WebM block");
    }
    return { track: track.value, offset: view.getInt16(track.bytes) };
  }
}

function requiredEnd(element: Element): number {
  if (element.end === null) throw new RangeError("Unexpected unknown WebM element size");
  return element.end;
}

async function* children(reader: WebmReader, parent: Element): AsyncGenerator<Element> {
  const end = requiredEnd(parent);
  for (let offset = parent.body; offset < end; ) {
    const child = await reader.element(offset);
    offset = requiredEnd(child);
    if (offset > end) throw new RangeError("Truncated WebM parent");
    yield child;
  }
}

async function readTrackTypes(reader: WebmReader, tracks: Element): Promise<Map<number, number>> {
  const types = new Map<number, number>();
  for await (const entry of children(reader, tracks)) {
    if (entry.id !== TRACK_ENTRY) continue;
    let number: number | undefined;
    let type: number | undefined;
    for await (const field of children(reader, entry)) {
      if (field.id === TRACK_NUMBER) number = await reader.unsigned(field);
      if (field.id === TRACK_TYPE) type = await reader.unsigned(field);
    }
    if (number !== undefined && type !== undefined) types.set(number, type);
  }
  return types;
}

interface Bounds {
  readonly first: number;
  readonly last: number;
}

export interface WebmCoverage {
  readonly video: Bounds | null;
  readonly audio: Bounds | null;
  readonly audioExpected: boolean;
}

export async function readWebmCoverage(file: Blob): Promise<WebmCoverage | null> {
  const reader = new WebmReader(file);
  const bounds = new Map<number, Bounds>();
  let trackTypes = new Map<number, number>();
  let scale = DEFAULT_SCALE_NS;
  let clusterTime = 0;

  const recordBlock = async (element: Element): Promise<void> => {
    const { track, offset } = await reader.block(element);
    const type = trackTypes.get(track);
    if (type !== VIDEO && type !== AUDIO) return;
    const time = ((clusterTime + offset) * scale) / DEFAULT_SCALE_NS;
    const previous = bounds.get(type);
    bounds.set(type, {
      first: Math.min(previous?.first ?? time, time),
      last: Math.max(previous?.last ?? time, time),
    });
  };

  try {
    for (let offset = 0; offset < file.size; ) {
      const element = await reader.element(offset);
      switch (element.id) {
        case SEGMENT:
          offset = element.body;
          continue;
        case CLUSTER:
          // Chromium's live muxer can leave the cluster size unknown.
          clusterTime = 0;
          offset = element.body;
          continue;
        case INFO:
          for await (const field of children(reader, element)) {
            if (field.id === TIMESTAMP_SCALE) scale = await reader.unsigned(field);
          }
          break;
        case TRACKS:
          trackTypes = await readTrackTypes(reader, element);
          break;
        case TIMESTAMP:
          clusterTime = await reader.unsigned(element);
          break;
        case SIMPLE_BLOCK:
          await recordBlock(element);
          break;
        case BLOCK_GROUP:
          for await (const block of children(reader, element)) {
            if (block.id === BLOCK) await recordBlock(block);
          }
          break;
      }
      offset = requiredEnd(element);
    }
  } catch {
    return null;
  }
  return {
    video: bounds.get(VIDEO) ?? null,
    audio: bounds.get(AUDIO) ?? null,
    audioExpected: [...trackTypes.values()].includes(AUDIO),
  };
}
