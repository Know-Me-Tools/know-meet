/**
 * In-webview scenario driver for Tauri on macOS (task 15.5). WKWebView has no
 * WebDriver, so this script is injected as the Tauri initialization script. It
 * runs once per page load:
 *   - no `kmStep` query parameter: ask the collector for progress and navigate to
 *     the next step of the plan (or report `done`);
 *   - `kmStep=<n>`: drive step n like the Playwright suite does (submit, settle,
 *     interactions), post the result to POST /spike-report and re-post while the
 *     collector reports problems (Playwright's expect.poll, `verdictPollMs`), then
 *     navigate to step n + 1.
 * Concatenated into one classic script by build-driver.ts (imports and `export`
 * keywords are stripped there).
 */
import type { ExpectedOutcome } from "../domain/expected.ts";
import type { HostileCorpusFile, HostileItem } from "../domain/hostile.ts";
import type { ScenarioFile } from "../domain/scenario.ts";
import type { RunStatus } from "../domain/spike-probe.ts";
import type { ClientChecks, DriverConfig, DriverStep, ReportProgress, ReportVerdict, ResultReport, SpikeReport, WebviewMetrics } from "../domain/spike-report.ts";
import { kmInstallInstrumentation, kmStartFrameProbe, type WebviewInstrumentation } from "./instrumentation.ts";
import { kmDisallowedRequests, kmDomProblems, kmHostileProblems, kmOnAttributes, kmPerformInteraction, kmPoll, kmSleep, kmSnapshot, kmSubmitPrompt, kmWaitAssistantText, kmWaitServerIdle, kmWaitSettled } from "./page-actions.ts";

const KM_WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const KM_FIRST_SETTLE_TIMEOUT_MS = 180_000;

interface AxeLike {
  run(context: Document, options: { runOnly: { type: "tag"; values: string[] } }): Promise<{ violations: { id: string; impact?: string | null; help: string; nodes: unknown[] }[] }>;
}

interface StepContext {
  readonly config: DriverConfig;
  readonly w: WebviewInstrumentation;
  readonly index: number;
  readonly step: DriverStep;
  readonly sessionId: string;
  readonly startedAtEpochMs: number;
}

async function kmGetJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const body: T = (await res.json()) as T;
  return body;
}

async function kmPost(config: DriverConfig, report: SpikeReport): Promise<ReportVerdict | null> {
  const res = await fetch(`${config.harnessUrl}/spike-report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(report) });
  if (!res.ok) throw new Error(`POST /spike-report -> ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  const verdict: ReportVerdict = (await res.json()) as ReportVerdict;
  return verdict;
}

function kmEvent(config: DriverConfig, step: number | null, event: "start" | "csp-header" | "driver-error" | "done", detail: string): Promise<ReportVerdict | null> {
  return kmPost(config, { kind: "event", runId: config.runId, step, event, detail });
}

function kmSessionId(config: DriverConfig, index: number): string {
  return `tauri-${config.prototype}-${config.runId}-s${index}`;
}

function kmNavigate(config: DriverConfig, w: WebviewInstrumentation, index: number): void {
  const step = config.plan[index];
  if (step === undefined) return;
  const app = new URL(config.appUrl);
  const onApp = location.protocol === app.protocol && location.host === app.host;
  const url = new URL(onApp ? `${location.protocol}//${location.host}${location.pathname}` : config.appUrl);
  url.search = "";
  url.searchParams.set("scenario", step.scenarioId);
  url.searchParams.set("agui", config.harnessUrl);
  url.searchParams.set("session", kmSessionId(config, index));
  url.searchParams.set("allowMediaOrigin", new URL(config.harnessUrl).origin);
  url.searchParams.set("kmStep", String(index));
  w.ownNavigation = true;
  location.replace(url.toString());
}

/**
 * The first settle, observed two ways: event-driven render-complete (instrumentation.ts
 * renderSettle, the reported total) and the legacy 20 ms setTimeout poll (kept for comparison;
 * hidden pages clamp it to ~1 s). Awaiting the poll keeps the step pacing of earlier runs.
 */
async function kmFirstSettle(w: WebviewInstrumentation): Promise<{ legacy: { status: RunStatus; at: number }; event: { status: string; at: number } | null }> {
  const legacy = await kmWaitSettled([], KM_FIRST_SETTLE_TIMEOUT_MS, 20);
  return { legacy, event: w.renderSettle };
}

function kmMetrics(w: WebviewInstrumentation, first: { legacy: { status: RunStatus; at: number }; event: { status: string; at: number } | null }): WebviewMetrics {
  const submitAt = w.submitAt;
  const settle = first.event ?? first.legacy;
  const tasks = w.longTaskSupported && submitAt !== null ? w.longTasks.filter((t) => t.start >= submitAt) : null;
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return {
    timeToFirstTokenMs: submitAt === null || w.firstTokenAt === null ? null : w.firstTokenAt - submitAt,
    totalStreamMs: submitAt === null ? null : settle.at - submitAt,
    totalStreamSource: first.event === null ? "legacy-poll-fallback" : "mutation-render-settle",
    legacyPollTotalStreamMs: submitAt === null ? null : first.legacy.at - submitAt,
    firstSettleStatus: first.legacy.status,
    counts: window.__spike?.renderCounts() ?? null,
    longTaskTotalMs: tasks === null ? null : tasks.reduce((s, t) => s + t.duration, 0),
    longTaskCount: tasks === null ? null : tasks.length,
    jsHeapUsedBytes: memory?.usedJSHeapSize ?? null,
    domNodes: document.getElementsByTagName("*").length,
    hasFocus: document.hasFocus(),
    visibility: document.visibilityState,
    framesPerSecond: submitAt === null || w.frames.length === 0 ? null : Math.round((w.frames.filter((t) => t >= submitAt && t <= settle.at).length / Math.max(1, settle.at - submitAt)) * 10_000) / 10,
  };
}

async function kmAxe(config: DriverConfig): Promise<string[] | null> {
  const axe = (window as Window & { axe?: AxeLike }).axe;
  if (!config.axe || axe === undefined) return null;
  const result = await axe.run(document, { runOnly: { type: "tag", values: KM_WCAG_TAGS } });
  return result.violations.map((v) => `${v.id} (${v.impact ?? "n/a"}): ${v.nodes.length} node(s) - ${v.help}`);
}

/** Hostile finalize time (checks/hostile.spec.ts finalizeTime). */
async function kmFinalizeMs(messageId: string): Promise<number> {
  await kmWaitAssistantText(1);
  const start = Date.now();
  await kmPoll("hostile message finalized", () => (kmSnapshot().messages.some((m) => m.id === messageId && m.status !== "streaming") ? true : null), 30_000, 50);
  return Date.now() - start;
}

interface Driven {
  metrics: WebviewMetrics | null;
  finalizeMs: number | null;
  deviations: string[];
  axe: string[] | null;
}

async function kmDrive(ctx: StepContext, scenario: ScenarioFile, driven: Driven): Promise<void> {
  const { config, w, step, sessionId } = ctx;
  await kmPoll("__spike.ready", () => (window.__spike?.ready === true ? true : null), 30_000);
  if (window.__spike?.contractVersion !== 1) throw new Error(`contractVersion ${String(window.__spike?.contractVersion)}`);
  window.__spike.resetRenderCounts();
  await kmSubmitPrompt(scenario.userPrompt);
  if (step.scenarioId.startsWith("hostile/")) driven.finalizeMs = await kmFinalizeMs(config.hostileMessageId);
  const cancelsFirst = scenario.interactions[0]?.do === "cancel-run";
  if (step.mode === "measure" || !cancelsFirst) {
    driven.metrics = kmMetrics(w, await kmFirstSettle(w));
  }
  if (step.mode === "conformance") {
    for (const interaction of scenario.interactions) await kmPerformInteraction(config.harnessUrl, sessionId, interaction, driven.deviations);
    if (driven.metrics === null) driven.metrics = kmMetrics(w, await kmFirstSettle(w));
  }
  await kmWaitServerIdle(config.harnessUrl, sessionId);
  if (step.mode === "conformance") driven.axe = await kmAxe(config);
}

function kmClientChecks(ctx: StepContext, expected: ExpectedOutcome, hostile: { item: HostileItem; global: readonly string[] } | null, driven: Driven): ClientChecks {
  return {
    domProblems: kmDomProblems(expected),
    hostileProblems: hostile === null ? [] : kmHostileProblems(hostile.item, hostile.global),
    xssCalls: [...ctx.w.xssCalls],
    dialogs: [...ctx.w.dialogs],
    disallowedRequests: kmDisallowedRequests(ctx.config.harnessUrl),
    onAttributes: hostile === null ? [] : kmOnAttributes(),
    finalizeMs: driven.finalizeMs,
    deviations: driven.deviations,
  };
}

function kmSafeSnapshot(): ResultReport["snapshot"] {
  try {
    return kmSnapshot();
  } catch {
    return null;
  }
}

async function kmRunStep(ctx: StepContext): Promise<void> {
  const { config, step } = ctx;
  const driven: Driven = { metrics: null, finalizeMs: null, deviations: [], axe: null };
  let scenario: ScenarioFile | null = null;
  let hostile: { item: HostileItem; global: readonly string[] } | null = null;
  let error: string | null = null;
  try {
    scenario = (await kmGetJson<{ scenario: ScenarioFile }>(`${config.harnessUrl}/scenarios/${encodeURI(step.scenarioId)}`)).scenario;
    if (step.scenarioId.startsWith("hostile/")) {
      const corpus = await kmGetJson<HostileCorpusFile>(`${config.harnessUrl}/hostile`);
      const item = corpus.items.find((i) => `hostile/${i.id}` === step.scenarioId);
      if (item === undefined) throw new Error(`hostile item ${step.scenarioId} missing`);
      hostile = { item, global: corpus.globalForbiddenSelectors };
    }
    await kmDrive(ctx, scenario, driven);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }
  const started = performance.now();
  for (let attempt = 1; ; attempt += 1) {
    const report: ResultReport = {
      kind: "result",
      runId: config.runId,
      prototype: config.prototype,
      step: ctx.index,
      scenarioId: step.scenarioId,
      repeat: step.repeat,
      mode: step.mode,
      sessionId: ctx.sessionId,
      startedAtEpochMs: ctx.startedAtEpochMs,
      attempt,
      snapshot: kmSafeSnapshot(),
      metrics: driven.metrics,
      client: kmClientChecks(ctx, scenario?.expected ?? { runStatus: "finished" }, hostile, driven),
      csp: [...ctx.w.csp],
      axe: driven.axe,
      userAgent: navigator.userAgent,
      error,
    };
    const verdict = await kmPost(config, report);
    const clean = (verdict?.problems.length ?? 0) === 0;
    if (clean || error !== null || step.mode === "measure" || performance.now() - started > config.verdictPollMs) return;
    await kmSleep(250);
  }
}

async function kmCspHeader(config: DriverConfig): Promise<void> {
  const res = await fetch(location.href);
  await kmEvent(config, null, "csp-header", `${res.headers.get("content-security-policy") ?? "<none>"} | ua=${navigator.userAgent}`);
}

export async function kmWebviewDriver(config: DriverConfig): Promise<void> {
  if (window.top !== window) return;
  const w = kmInstallInstrumentation();
  if (config.frameProbe === true) kmStartFrameProbe(w);
  const raw = new URLSearchParams(location.search).get("kmStep");
  if (raw === null) {
    const progress = await kmGetJson<ReportProgress>(`${config.harnessUrl}/spike-report/${config.runId}/progress`);
    if (progress.records === 0) {
      await kmEvent(config, null, "start", `${config.plan.length} steps; ${location.href}`);
      await kmCspHeader(config).catch((e: unknown) => kmEvent(config, null, "driver-error", `csp header: ${String(e)}`));
    }
    const next = progress.lastStep + 1;
    if (next >= config.plan.length) await kmEvent(config, null, "done", "plan complete");
    else kmNavigate(config, w, next);
    return;
  }
  const index = Number(raw);
  const step = config.plan[index];
  if (step === undefined) {
    await kmEvent(config, index, "done", "plan complete");
    return;
  }
  const startedAtEpochMs = Date.now();
  addEventListener("pagehide", () => {
    if (w.ownNavigation) return;
    const body = JSON.stringify({ kind: "event", runId: config.runId, step: index, event: "unexpected-navigation", detail: location.href });
    navigator.sendBeacon(`${config.harnessUrl}/spike-report`, new Blob([body], { type: "text/plain" }));
  });
  if (document.readyState === "loading") await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  await kmRunStep({ config, w, index, step, sessionId: kmSessionId(config, index), startedAtEpochMs }).catch((e: unknown) =>
    kmEvent(config, index, "driver-error", e instanceof Error ? e.message : String(e)),
  );
  if (index + 1 >= config.plan.length) await kmEvent(config, index, "done", "plan complete");
  else kmNavigate(config, w, index + 1);
}
