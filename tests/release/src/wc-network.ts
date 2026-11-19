/**
 * Network observation for the on-device privacy oracles (WC-7, WC-8) and the
 * CSP violation log (WC-4, WC-7, WC-8, WC-10).
 *
 * One recorder per participant. It collects, for the whole run and across
 * reloads: every HTTP request (URL, headers, body bytes), every WebSocket frame,
 * console CSP messages (these also cover worker violations) and, through the
 * page tap, bodies Playwright cannot show (Blob and FormData uploads).
 *
 * Scope limit, stated in wc-scenarios.md: chat between participants travels over
 * the LiveKit data channel, which Playwright's network events do not show. The
 * oracle therefore proves "no HTTP upload, no signalling-socket frame and no
 * page-level egress carries it", not "no byte of it ever left the browser".
 */
import type { BrowserContext, Page } from "@playwright/test";
import { type CspViolation, type EgressEntry, readTaps } from "./wc-taps.ts";

/** Chromium marks a bare EBML header (WebM and Matroska) with these four bytes. */
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
/** WebM Cluster element id; chunks after the first start with it. */
const CLUSTER_MAGIC = Buffer.from([0x1f, 0x43, 0xb6, 0x75]);
/** A body this large is not a token request or a chat message. */
export const LARGE_BODY_BYTES = 64 * 1024;

export interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Buffer | null;
}

export interface RecordedFrame {
  readonly socket: string;
  readonly direction: "sent" | "received";
  readonly payload: Buffer;
}

export interface NetworkSnapshot {
  readonly requests: readonly RecordedRequest[];
  readonly frames: readonly RecordedFrame[];
  readonly egress: readonly EgressEntry[];
  readonly cspViolations: readonly CspViolation[];
  readonly cspConsole: readonly string[];
}

export interface NetworkRecorder {
  /** Pulls the page taps into the recorder. Call before a reload or navigation, and before collect. */
  checkpoint(): Promise<void>;
  /** Everything seen so far (does a checkpoint first). */
  collect(): Promise<NetworkSnapshot>;
}

const CSP_CONSOLE = /Content Security Policy|Refused to (load|create|connect|execute|apply)/i;

function toBuffer(payload: string | Buffer): Buffer {
  return typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
}

/** Scheme, host and path only: the query of a LiveKit signal URL holds the access token. */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return raw.split("?")[0] ?? raw;
  }
}

export async function recordNetwork(context: BrowserContext, page: Page): Promise<NetworkRecorder> {
  const requests: RecordedRequest[] = [];
  const frames: RecordedFrame[] = [];
  const egress: EgressEntry[] = [];
  const cspViolations: CspViolation[] = [];
  const cspConsole: string[] = [];

  context.on("request", (request) => {
    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: request.postDataBuffer(),
    });
  });
  page.on("websocket", (socket) => {
    const name = redactUrl(socket.url());
    socket.on("framesent", (frame) =>
      frames.push({ socket: name, direction: "sent", payload: toBuffer(frame.payload) }),
    );
    socket.on("framereceived", (frame) =>
      frames.push({ socket: name, direction: "received", payload: toBuffer(frame.payload) }),
    );
  });
  page.on("console", (message) => {
    if (CSP_CONSOLE.test(message.text())) cspConsole.push(message.text());
  });

  async function checkpoint(): Promise<void> {
    if (page.isClosed()) return;
    const taps = await readTaps(page);
    egress.push(...taps.egress);
    cspViolations.push(...taps.csp);
    // The in-page log lives until the next navigation. Drain what was read so a
    // later checkpoint on the same document does not count it twice.
    await page.evaluate(
      "window.__kmTaps && (window.__kmTaps.egress.length = 0, window.__kmTaps.csp.length = 0)",
    );
  }

  return {
    checkpoint,
    async collect() {
      await checkpoint();
      return {
        requests: [...requests],
        frames: [...frames],
        egress: [...egress],
        cspViolations: [...cspViolations],
        cspConsole: [...cspConsole],
      };
    },
  };
}

export type LeakPlace = "url" | "header" | "post-data" | "ws-frame" | "egress";

export interface Leak {
  readonly place: LeakPlace;
  readonly needle: string;
  /** Redacted URL or socket name. */
  readonly target: string;
}

function contains(haystack: Buffer | string, needle: string): boolean {
  return typeof haystack === "string"
    ? haystack.includes(needle)
    : haystack.includes(Buffer.from(needle, "utf8"));
}

/**
 * Every place in the recorded traffic that carries one of the needles (chat texts,
 * history ids). Needles must be unique per run and must not be a value the
 * service legitimately receives (the room code, the display name).
 */
export function findLeaks(snapshot: NetworkSnapshot, needles: readonly string[]): Leak[] {
  const leaks: Leak[] = [];
  const add = (place: LeakPlace, needle: string, target: string): void => {
    leaks.push({ place, needle, target: redactUrl(target) });
  };
  for (const needle of needles) {
    for (const request of snapshot.requests) {
      if (contains(decodeURIComponentSafe(request.url), needle) || contains(request.url, needle)) {
        add("url", needle, request.url);
      }
      for (const value of Object.values(request.headers)) {
        if (contains(decodeURIComponentSafe(value), needle)) add("header", needle, request.url);
      }
      if (request.body !== null && contains(request.body, needle)) {
        add("post-data", needle, request.url);
      }
    }
    for (const frame of snapshot.frames) {
      if (contains(frame.payload, needle)) add("ws-frame", needle, frame.socket);
    }
    for (const entry of snapshot.egress) {
      if (contains(decodeURIComponentSafe(entry.url), needle)) add("egress", needle, entry.url);
      if (entry.text !== undefined && contains(entry.text, needle)) {
        add("egress", needle, entry.url);
      }
    }
  }
  return leaks;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export interface RecordingEgress {
  readonly why: string;
  readonly target: string;
}

/**
 * Anything that looks like recording bytes leaving the page: a WebM or Matroska
 * signature in a body or frame, a media-typed or very large upload body, or a
 * large WebSocket frame. A token request or chat message cannot match.
 */
export function findRecordingEgress(snapshot: NetworkSnapshot): RecordingEgress[] {
  const found: RecordingEgress[] = [];
  const hasMagic = (buffer: Buffer): boolean =>
    buffer.includes(EBML_MAGIC) || buffer.includes(CLUSTER_MAGIC);
  for (const request of snapshot.requests) {
    if (request.body === null) continue;
    const type = (request.headers["content-type"] ?? "").toLowerCase();
    if (hasMagic(request.body)) found.push({ why: "WebM signature in body", target: request.url });
    else if (/^(video|audio)\//.test(type))
      found.push({ why: `media body ${type}`, target: request.url });
    else if (request.body.length >= LARGE_BODY_BYTES) {
      found.push({ why: `body of ${request.body.length} bytes`, target: request.url });
    }
  }
  for (const frame of snapshot.frames) {
    if (hasMagic(frame.payload))
      found.push({ why: "WebM signature in frame", target: frame.socket });
    else if (frame.direction === "sent" && frame.payload.length >= LARGE_BODY_BYTES) {
      found.push({ why: `frame of ${frame.payload.length} bytes`, target: frame.socket });
    }
  }
  for (const entry of snapshot.egress) {
    const type = (entry.type ?? "").toLowerCase();
    if (/^(video|audio)\//.test(type))
      found.push({ why: `media ${entry.via} body ${type}`, target: entry.url });
    else if (entry.size >= LARGE_BODY_BYTES) {
      found.push({ why: `${entry.via} body of ${entry.size} bytes`, target: entry.url });
    }
  }
  return found.map((item) => ({ ...item, target: redactUrl(item.target) }));
}

/** Same-origin check for static assets: every URL whose path ends in one of the extensions. */
export function crossOriginAssets(
  snapshot: NetworkSnapshot,
  origin: string,
  extensions: readonly string[],
): string[] {
  return snapshot.requests
    .map((request) => request.url)
    .filter((url) => {
      const path = new URL(url).pathname.toLowerCase();
      return extensions.some((ext) => path.endsWith(ext)) && new URL(url).origin !== origin;
    })
    .map(redactUrl);
}

export function assetRequests(snapshot: NetworkSnapshot, extension: string): string[] {
  return snapshot.requests
    .map((request) => request.url)
    .filter((url) => new URL(url).pathname.toLowerCase().endsWith(extension))
    .map(redactUrl);
}

/** Safe-to-attach summary: methods, redacted URLs and sizes, no body, no header values. */
export function summarise(snapshot: NetworkSnapshot): unknown {
  return {
    requests: snapshot.requests.map((r) => ({
      method: r.method,
      url: redactUrl(r.url),
      bodyBytes: r.body?.length ?? 0,
    })),
    frames: snapshot.frames.map((f) => ({
      socket: f.socket,
      direction: f.direction,
      bytes: f.payload.length,
    })),
    egress: snapshot.egress.map((e) => ({
      via: e.via,
      url: redactUrl(e.url),
      kind: e.kind,
      size: e.size,
      type: e.type ?? "",
    })),
    cspViolations: snapshot.cspViolations,
    cspConsole: snapshot.cspConsole,
  };
}
