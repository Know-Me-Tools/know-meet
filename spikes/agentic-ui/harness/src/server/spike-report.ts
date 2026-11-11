/**
 * Collector for in-webview drivers (task 15.5): Tauri on macOS has no WebDriver,
 * so a driver injected into the webview posts `window.__spike` snapshots and page
 * metrics here. Each result is judged with the same comparison the Playwright
 * checks use (checks/support/compare.ts), plus the hostile guards that only the
 * server can see (evil-listener and media hits). Records are appended to
 * reports/spike-report/<runId>.jsonl.
 *
 *   POST /spike-report                    SpikeReport -> ReportVerdict (results) or 204 (events)
 *   GET  /spike-report/<runId>/progress   ReportProgress
 */
import { appendFileSync, mkdirSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { compareServer, compareSnapshot } from "../../checks/support/compare.ts";
import type { HostileCorpusFile, HostileItem } from "../domain/hostile.ts";
import type { ScenarioFile } from "../domain/scenario.ts";
import type { EventReport, ReportProgress, ResultReport, SpikeReport } from "../domain/spike-report.ts";
import { REPORTS_DIR } from "../shared/paths.ts";
import { substituteJson, type Origins } from "../shared/placeholders.ts";
import type { CorpusStore } from "./corpus-store.ts";
import { HttpError, isRecord, readJsonBody, sendJson } from "./http-util.ts";
import { summarizeSession, type SessionStore } from "./session-log.ts";

export const SPIKE_REPORT_DIR = join(REPORTS_DIR, "spike-report");
const RUN_ID = /^[a-z0-9][a-z0-9-]{0,80}$/;

interface CollectorState {
  readonly corpus: CorpusStore;
  readonly sessions: SessionStore;
  readonly origins: Origins;
}

interface RunProgress {
  lastStep: number;
  done: boolean;
  records: number;
  navigatedSteps: Set<number>;
}

const progress = new Map<string, RunProgress>();

function runProgress(runId: string): RunProgress {
  let p = progress.get(runId);
  if (p === undefined) {
    p = { lastStep: -1, done: false, records: 0, navigatedSteps: new Set() };
    progress.set(runId, p);
  }
  return p;
}

function parseReport(body: unknown): SpikeReport {
  if (!isRecord(body)) throw new HttpError(400, "report must be a JSON object");
  const { kind, runId } = body;
  if (kind !== "result" && kind !== "event") throw new HttpError(400, 'kind must be "result" or "event"');
  if (typeof runId !== "string" || !RUN_ID.test(runId)) throw new HttpError(400, "runId must match [a-z0-9-]");
  if (kind === "result") {
    if (typeof body["scenarioId"] !== "string" || typeof body["step"] !== "number" || typeof body["sessionId"] !== "string" || !isRecord(body["client"])) {
      throw new HttpError(400, "result needs scenarioId, step, sessionId and client");
    }
    return body as unknown as ResultReport;
  }
  if (typeof body["event"] !== "string") throw new HttpError(400, "event needs an event name");
  return body as unknown as EventReport;
}

function hostileItem(state: CollectorState, scenarioId: string): HostileItem | undefined {
  const corpus: HostileCorpusFile = substituteJson(state.corpus.hostile, state.origins);
  return corpus.items.find((i) => `hostile/${i.id}` === scenarioId);
}

/** The hostile.spec.ts guards, from what the driver saw in the page plus the server's hit log. */
function hostileProblems(state: CollectorState, report: ResultReport, navigated: boolean): string[] {
  const item = hostileItem(state, report.scenarioId);
  if (item === undefined) return [`hostile item ${report.scenarioId} missing from the corpus`];
  const c = report.client;
  const hits = state.sessions.hitsSince(report.startedAtEpochMs);
  const evil = hits.filter((h) => h.listener === "evil");
  const media = hits.filter((h) => h.listener === "allowed-media");
  const problems: string[] = [];
  if (c.xssCalls.length > 0) problems.push(`__kmXss sentinel called: ${c.xssCalls.join(", ")}`);
  if (c.dialogs.length > 0) problems.push(`dialogs opened: ${c.dialogs.join(", ")}`);
  if (navigated) problems.push("main-frame navigation away from the prototype");
  if (c.disallowedRequests.length > 0) problems.push(`requests to disallowed origins: ${c.disallowedRequests.join(", ")}`);
  if (evil.length > 0) problems.push(`evil listener hits: ${evil.map((h) => `${h.method} ${h.path}`).join(", ")}`);
  if (c.onAttributes.length > 0) problems.push(`on* attributes in the transcript: ${c.onAttributes.join(", ")}`);
  problems.push(...c.hostileProblems);
  const minMedia = item.assert.allowedMediaRequestsMin;
  if (minMedia !== undefined && media.length < minMedia) problems.push(`allowed media requests: expected at least ${minMedia}, got ${media.length}`);
  const budget = item.assert.finalizeWithinMs;
  if (budget !== undefined && (c.finalizeMs === null || c.finalizeMs > budget)) problems.push(`first text to complete: ${c.finalizeMs ?? "never"} ms > ${budget} ms`);
  return problems;
}

function judge(state: CollectorState, report: ResultReport, navigated: boolean): string[] {
  const problems: string[] = report.error === null ? [] : [`driver: ${report.error}`];
  const entry = state.corpus.get(report.scenarioId);
  if (entry === undefined) return [...problems, `unknown scenario ${report.scenarioId}`];
  const scenario: ScenarioFile = substituteJson(entry.scenario, state.origins);
  problems.push(...(report.snapshot === null ? ["no snapshot"] : compareSnapshot(scenario.expected, report.snapshot)));
  const log = state.sessions.find(report.sessionId);
  problems.push(...(log === undefined ? ["server: no request reached the mock server for this session"] : compareServer(scenario.expected.server, summarizeSession(log))));
  problems.push(...report.client.domProblems);
  if (entry.family === "hostile") problems.push(...hostileProblems(state, report, navigated));
  return problems;
}

function append(runId: string, record: unknown): void {
  mkdirSync(SPIKE_REPORT_DIR, { recursive: true });
  appendFileSync(join(SPIKE_REPORT_DIR, `${runId}.jsonl`), `${JSON.stringify(record)}\n`);
}

export async function handleSpikeReport(state: CollectorState, req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  if (req.method === "GET") {
    const match = /^\/spike-report\/([^/]+)\/progress$/.exec(path);
    if (match === null) throw new HttpError(404, `no route for GET ${path}`);
    const p = runProgress(match[1] ?? "");
    const body: ReportProgress = { lastStep: p.lastStep, done: p.done, records: p.records };
    sendJson(res, 200, body);
    return;
  }
  if (req.method !== "POST" || path !== "/spike-report") throw new HttpError(405, `${req.method ?? "?"} not allowed on ${path}`);
  const report = parseReport(await readJsonBody(req));
  const p = runProgress(report.runId);
  p.records += 1;
  const receivedAt = new Date().toISOString();
  if (report.kind === "event") {
    if (report.step !== null) p.lastStep = Math.max(p.lastStep, report.step);
    if (report.event === "unexpected-navigation" && report.step !== null) p.navigatedSteps.add(report.step);
    if (report.event === "done") p.done = true;
    append(report.runId, { receivedAt, ...report });
    res.writeHead(204);
    res.end();
    return;
  }
  p.lastStep = Math.max(p.lastStep, report.step);
  const problems = judge(state, report, p.navigatedSteps.has(report.step));
  append(report.runId, { receivedAt, ...report, verdict: { problems } });
  sendJson(res, 200, { problems });
}
