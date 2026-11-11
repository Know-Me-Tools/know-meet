/**
 * GET|POST /agui/<scenario-id>?session=&rate=&gap=&threadId=&runId=&lastEventId=
 *
 * POST takes an AG-UI RunAgentInput body (what @ag-ui/client HttpAgent sends).
 * GET serves the initial run (or a Last-Event-ID replay) for EventSource clients.
 * Query: rate = deltas/s (0 or "max" = unthrottled), gap = ms before other events.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pacing } from "../domain/scenario.ts";
import type { Origins } from "../shared/placeholders.ts";
import type { CorpusStore } from "./corpus-store.ts";
import { HttpError, readJsonBody, sendJson } from "./http-util.ts";
import { parseRunInput, type ParsedRunInput } from "./run-input.ts";
import { selectRun, type RunSelection } from "./run-selection.ts";
import type { RequestLogEntry, SessionLog, SessionStore } from "./session-log.ts";
import { streamRun } from "./stream-writer.ts";

export interface AguiContext {
  readonly corpus: CorpusStore;
  readonly sessions: SessionStore;
  readonly origins: Origins;
}

function parseNonNegative(raw: string | null, name: string): number | null {
  if (raw === null || raw === "") return null;
  if (raw === "max") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${name} must be a non-negative number or "max"`);
  return n;
}

export function pacingFrom(query: URLSearchParams, base: Pacing): Pacing {
  const rate = parseNonNegative(query.get("rate"), "rate");
  const gap = parseNonNegative(query.get("gap"), "gap");
  return { tokensPerSecond: rate ?? base.tokensPerSecond, eventGapMs: gap ?? base.eventGapMs };
}

function sessionIdFrom(req: IncomingMessage, query: URLSearchParams, input: ParsedRunInput): string {
  const header = req.headers["x-km-session"];
  const fromHeader = typeof header === "string" && header.length > 0 ? header : null;
  return query.get("session") ?? fromHeader ?? input.threadId ?? "default";
}

function lastEventIdFrom(req: IncomingMessage, query: URLSearchParams): string | null {
  const header = req.headers["last-event-id"];
  if (typeof header === "string" && header.length > 0) return header;
  const fromQuery = query.get("lastEventId");
  return fromQuery !== null && fromQuery.length > 0 ? fromQuery : null;
}

function logEntry(
  ctx: AguiContext,
  req: IncomingMessage,
  scenarioId: string,
  input: ParsedRunInput,
  lastEventId: string | null,
  selection: RunSelection,
  totalItems: number,
): RequestLogEntry {
  const isRun = selection.kind === "run";
  return {
    seq: ctx.sessions.nextSeq(),
    receivedAt: new Date().toISOString(),
    method: req.method ?? "GET",
    scenarioId,
    trigger: isRun ? selection.trigger : selection.kind === "no-content" ? "replay" : "unmatched",
    runIndex: selection.kind === "unmatched" ? null : selection.runIndex,
    lastEventId,
    threadId: input.threadId,
    runId: input.runId,
    inputValid: input.valid,
    inputProblems: input.problems,
    lastUserText: input.lastUserText,
    resumeEntries: input.resume,
    a2uiAction: input.a2uiAction,
    resolvedAfterExpiry: isRun && selection.resolvedAfterExpiry,
    startAt: isRun ? selection.startAt : 0,
    totalItems,
    itemsWritten: 0,
    outcome: "in-progress",
    note: selection.kind === "run" ? null : selection.note,
  };
}

function runIdsFor(input: ParsedRunInput, query: URLSearchParams, session: SessionLog, seq: number): { threadId: string; runId: string } {
  return {
    threadId: input.threadId ?? query.get("threadId") ?? `thread-${session.sessionId}`,
    runId: input.runId ?? query.get("runId") ?? `run-${seq}`,
  };
}

export async function handleAgui(ctx: AguiContext, req: IncomingMessage, res: ServerResponse, scenarioId: string, query: URLSearchParams): Promise<void> {
  const entry = ctx.corpus.get(scenarioId);
  if (entry === undefined) throw new HttpError(404, `unknown scenario "${scenarioId}"; GET /scenarios lists ids`);
  const input = req.method === "POST" ? parseRunInput(await readJsonBody(req)) : parseRunInput(undefined);
  const scenario = entry.scenario;
  const pacing = pacingFrom(query, scenario.pacing);
  const session = ctx.sessions.session(sessionIdFrom(req, query, input));
  const lastEventId = lastEventIdFrom(req, query);
  const selection = selectRun(scenario, session, input, lastEventId);
  const run = selection.kind === "unmatched" ? undefined : scenario.runs[selection.runIndex];
  const log = logEntry(ctx, req, scenarioId, input, lastEventId, selection, run?.items.length ?? 0);
  session.requests.push(log);

  if (selection.kind === "unmatched" || run === undefined) {
    log.outcome = "rejected";
    sendJson(res, 409, { error: "no run matches this request", note: log.note, session: session.sessionId });
    return;
  }
  if (selection.kind === "no-content") {
    log.outcome = "no-content";
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
    return;
  }

  session.lastRunIndex = selection.runIndex;
  const faultArmed = selection.startAt === 0 && !session.faultsFired.includes(selection.runIndex);
  const dropAfter = faultArmed ? (run.faults?.dropConnectionAfterItems ?? null) : null;
  if (dropAfter !== null) session.faultsFired.push(selection.runIndex);

  const result = await streamRun(req, res, {
    items: run.items,
    startAt: selection.startAt,
    pacing,
    dropAfterItems: dropAfter,
    runIds: runIdsFor(input, query, session, log.seq),
    origins: ctx.origins,
    rewrites: run.rewrites,
    onInterruptExpiry: (id, expiresAt) => {
      session.interruptExpiries[id] = expiresAt;
    },
    onProgress: (written) => {
      log.itemsWritten = written;
    },
    headers: {
      "X-Km-Session": session.sessionId,
      "X-Km-Run-Index": String(selection.runIndex),
      "X-Km-Trigger": selection.trigger,
    },
  });
  log.itemsWritten = result.written;
  log.outcome = result.outcome;
}
