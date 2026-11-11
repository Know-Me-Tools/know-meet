/**
 * The mock AG-UI server: routing and lifecycle. See README.md "Mock server" for
 * the route table. `startHarnessServer` is also used in-process by the
 * measurement script when no server is running.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  A2UI_ACTIVITY_TYPE,
  A2UI_BASIC_CATALOG_ID,
  A2UI_SPEC_VERSION,
  A2UI_WEB_CORE_PACKAGE,
  AG_UI_CORE_PACKAGE,
  AG_UI_PROTOCOL_VERSION,
  CORPUS_FORMAT_VERSION,
} from "../domain/versions.ts";
import { substituteJson, type Origins } from "../shared/placeholders.ts";
import { handleAgui } from "./agui-handler.ts";
import { originsFor, type ServerConfig } from "./config.ts";
import { CorpusStore } from "./corpus-store.ts";
import { applyCors, HttpError, sendError, sendJson } from "./http-util.ts";
import { createEvilServer, loadMedia, serveMedia } from "./media.ts";
import { SessionStore, summarizeSession } from "./session-log.ts";
import { handleSpikeReport } from "./spike-report.ts";

export interface RunningHarness {
  readonly origins: Origins;
  readonly corpus: CorpusStore;
  readonly sessions: SessionStore;
  close(): Promise<void>;
}

interface AppState {
  readonly corpus: CorpusStore;
  readonly sessions: SessionStore;
  readonly media: ReturnType<typeof loadMedia>;
  readonly startedAt: number;
  origins: Origins;
}

function decodeTail(path: string, prefix: string): string {
  try {
    return decodeURIComponent(path.slice(prefix.length));
  } catch {
    throw new HttpError(400, "malformed percent-encoding in path");
  }
}

function health(state: AppState): unknown {
  return {
    ok: true,
    uptimeMs: Date.now() - state.startedAt,
    origins: state.origins,
    versions: {
      agUiCore: AG_UI_CORE_PACKAGE,
      agUiProtocol: AG_UI_PROTOCOL_VERSION,
      a2uiWebCore: A2UI_WEB_CORE_PACKAGE,
      a2uiSpec: A2UI_SPEC_VERSION,
      a2uiCatalog: A2UI_BASIC_CATALOG_ID,
      a2uiActivityType: A2UI_ACTIVITY_TYPE,
      corpusFormat: CORPUS_FORMAT_VERSION,
    },
    corpus: state.corpus.counts(),
    sessions: state.sessions.ids().length,
  };
}

function handleSessions(state: AppState, req: IncomingMessage, res: ServerResponse, path: string): void {
  if (path === "/sessions") {
    sendJson(res, 200, { sessions: state.sessions.ids() });
    return;
  }
  const id = decodeTail(path, "/sessions/");
  if (req.method === "DELETE") {
    sendJson(res, 200, { deleted: state.sessions.delete(id) });
    return;
  }
  const log = state.sessions.find(id);
  if (log === undefined) throw new HttpError(404, `no session "${id}"`);
  sendJson(res, 200, { log, summary: summarizeSession(log) });
}

function handleCorpus(state: AppState, res: ServerResponse, path: string): boolean {
  if (path === "/scenarios") {
    sendJson(res, 200, { scenarios: state.corpus.summaries() });
    return true;
  }
  if (path.startsWith("/scenarios/")) {
    const entry = state.corpus.get(decodeTail(path, "/scenarios/"));
    if (entry === undefined) throw new HttpError(404, "unknown scenario");
    sendJson(res, 200, { family: entry.family, scenario: substituteJson(entry.scenario, state.origins) });
    return true;
  }
  if (path === "/a2ui/surfaces") {
    sendJson(res, 200, { surfaces: [...state.corpus.surfaces.keys()] });
    return true;
  }
  if (path.startsWith("/a2ui/surfaces/")) {
    const surface = state.corpus.surfaces.get(decodeTail(path, "/a2ui/surfaces/"));
    if (surface === undefined) throw new HttpError(404, "unknown surface");
    sendJson(res, 200, substituteJson(surface, state.origins));
    return true;
  }
  if (path === "/hostile") {
    sendJson(res, 200, substituteJson(state.corpus.hostile, state.origins));
    return true;
  }
  return false;
}

async function route(state: AppState, req: IncomingMessage, res: ServerResponse): Promise<void> {
  applyCors(req, res);
  const url = new URL(req.url ?? "/", "http://harness.invalid");
  const path = url.pathname;
  const method = req.method ?? "GET";
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (path.startsWith("/agui/") && (method === "GET" || method === "POST")) {
    await handleAgui(state, req, res, decodeTail(path, "/agui/"), url.searchParams);
    return;
  }
  if (path.startsWith("/media/") && (method === "GET" || method === "HEAD")) {
    serveMedia(state.media, state.sessions, req, res, decodeTail(path, "/media/"));
    return;
  }
  if (path === "/sessions" || path.startsWith("/sessions/")) {
    handleSessions(state, req, res, path);
    return;
  }
  if (path === "/spike-report" || path.startsWith("/spike-report/")) {
    await handleSpikeReport(state, req, res, path);
    return;
  }
  if (method !== "GET") throw new HttpError(405, `${method} not allowed on ${path}`);
  if (path === "/healthz") {
    sendJson(res, 200, health(state));
    return;
  }
  if (path === "/hits") {
    const since = Number(url.searchParams.get("since") ?? "0");
    if (!Number.isFinite(since)) throw new HttpError(400, "since must be epoch milliseconds");
    const hits = state.sessions.hitsSince(since);
    sendJson(res, 200, { allowedMedia: hits.filter((h) => h.listener === "allowed-media"), evil: hits.filter((h) => h.listener === "evil") });
    return;
  }
  if (!handleCorpus(state, res, path)) throw new HttpError(404, `no route for ${method} ${path}`);
}

function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

export async function startHarnessServer(config: ServerConfig): Promise<RunningHarness> {
  const sessions = new SessionStore();
  const state: AppState = {
    corpus: CorpusStore.load(),
    sessions,
    media: loadMedia(),
    startedAt: Date.now(),
    origins: originsFor(config.host, config.port, config.evilPort),
  };
  const main = createServer((req, res) => {
    route(state, req, res).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      if (status === 500) process.stderr.write(`harness: ${req.method} ${req.url}: ${message}\n`);
      sendError(res, status, message);
    });
  });
  const evil = createEvilServer(sessions);
  const port = await listen(main, config.port, config.host);
  const evilPort = await listen(evil, config.evilPort, config.host);
  state.origins = originsFor(config.host, port, evilPort);
  return {
    origins: state.origins,
    corpus: state.corpus,
    sessions,
    close: async () => {
      await Promise.all([closeServer(main), closeServer(evil)]);
    },
  };
}
