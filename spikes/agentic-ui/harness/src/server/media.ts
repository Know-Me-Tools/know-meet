/**
 * GET /media/<file> on the allowed origin (fixtures in corpus/media/, with
 * single-range support for <video>/<audio>), and the evil listener, which logs
 * every request it receives and answers 404.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { HARNESS_ROOT } from "../shared/paths.ts";
import { HttpError } from "./http-util.ts";
import type { SessionStore } from "./session-log.ts";

export const MEDIA_DIR = join(HARNESS_ROOT, "corpus", "media");

const MIME: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
};

interface MediaFile {
  readonly bytes: Buffer;
  readonly mime: string;
}

export function loadMedia(): ReadonlyMap<string, MediaFile> {
  const files = new Map<string, MediaFile>();
  for (const name of readdirSync(MEDIA_DIR)) {
    const mime = MIME[extname(name)];
    if (mime !== undefined) files.set(name, { bytes: readFileSync(join(MEDIA_DIR, name)), mime });
  }
  return files;
}

function parseRange(header: string | undefined, size: number): { start: number; end: number } | null {
  if (header === undefined) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null) return null;
  const [, rawStart = "", rawEnd = ""] = match;
  if (rawStart === "" && rawEnd === "") return null;
  const start = rawStart === "" ? Math.max(0, size - Number(rawEnd)) : Number(rawStart);
  const end = rawStart === "" || rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (start > end || start >= size) throw new HttpError(416, "range not satisfiable");
  return { start, end };
}

export function serveMedia(
  media: ReadonlyMap<string, MediaFile>,
  sessions: SessionStore,
  req: IncomingMessage,
  res: ServerResponse,
  name: string,
): void {
  sessions.recordHit({ at: Date.now(), listener: "allowed-media", method: req.method ?? "GET", path: `/media/${name}`, referer: req.headers.referer ?? null });
  const file = media.get(name);
  if (file === undefined) throw new HttpError(404, `no media fixture "${name}"`);
  const headers: Record<string, string> = {
    "Content-Type": file.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (file.mime === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  const range = parseRange(req.headers.range, file.bytes.length);
  if (range === null) {
    res.writeHead(200, { ...headers, "Content-Length": String(file.bytes.length) });
    res.end(req.method === "HEAD" ? undefined : file.bytes);
    return;
  }
  const slice = file.bytes.subarray(range.start, range.end + 1);
  res.writeHead(206, { ...headers, "Content-Length": String(slice.length), "Content-Range": `bytes ${range.start}-${range.end}/${file.bytes.length}` });
  res.end(req.method === "HEAD" ? undefined : slice);
}

/** Any request here is a failure the checks look for via GET /hits. */
export function createEvilServer(sessions: SessionStore): Server {
  return createServer((req, res) => {
    sessions.recordHit({ at: Date.now(), listener: "evil", method: req.method ?? "GET", path: req.url ?? "/", referer: req.headers.referer ?? null });
    req.resume();
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("evil origin: this request is a test failure\n");
  });
}
