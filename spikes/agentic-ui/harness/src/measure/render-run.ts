/**
 * Gate 16.3: one scenario run, from submit to render-complete, in a fresh browser context.
 * Continuous capture over [submit, render-complete]: long tasks, CDP main-thread time (Chromium),
 * rAF frame deltas, keydown event-to-next-paint latency injected mid-stream, JS heap, DOM nodes.
 */
import { loadavg } from "node:os";
import type { Browser, BrowserContext, CDPSession, Page } from "@playwright/test";
import type { RunStatus } from "../domain/spike-probe.ts";
import { installRenderTimeline, type InputSample, type RenderCompleteResult } from "./render-timeline.ts";

export interface RenderRunTarget {
  readonly prototype: "hybrid" | "own";
  readonly baseUrl: string;
  readonly harnessUrl: string;
  readonly browser: "chromium" | "webkit";
  readonly scenarioId: string;
  readonly userPrompt: string;
  readonly repeat: number;
}

export interface CpuMetrics {
  readonly taskMs: number;
  readonly scriptMs: number;
  readonly layoutMs: number;
  readonly styleMs: number;
}

export interface FrameStats {
  readonly frames: number;
  readonly droppedFrames: number;
  readonly jankFrames: number;
  readonly maxFrameMs: number;
  readonly medianFrameMs: number;
}

export interface RenderRunResult {
  readonly prototype: "hybrid" | "own";
  readonly browser: "chromium" | "webkit";
  readonly scenarioId: string;
  readonly repeat: number;
  readonly sessionId: string;
  readonly startedAt: string;
  readonly loadavg1: number;
  readonly runStatus: RunStatus | null;
  readonly timeToFirstTokenMs: number | null;
  readonly totalStreamMs: number | null;
  readonly renderCompleteMs: number | null;
  readonly renderLagAfterSettleMs: number | null;
  readonly renderCompleteTimedOut: boolean | null;
  readonly longTaskTotalMs: number | null;
  readonly longTaskCount: number | null;
  readonly longTaskAfterSettleMs: number | null;
  readonly cpu: CpuMetrics | null;
  readonly frameStats: FrameStats | null;
  readonly inputLatencyMs: readonly number[];
  readonly inputLatencyInStreamMs: readonly number[];
  readonly eventTimingDurationsMs: readonly number[];
  readonly reactCommits: number | null;
  readonly componentRenders: number | null;
  readonly storeCommits: number | null;
  readonly mutationCount: number | null;
  readonly jsHeapUsedBytes: number | null;
  readonly jsHeapUsedAfterGcBytes: number | null;
  readonly domNodes: number | null;
  readonly error: string | null;
}

const SETTLED = ["finished", "interrupted", "cancelled", "error"];
const SETTLE_TIMEOUT_MS = 180_000;
export const QUIET_MS = 300;
const RENDER_MAX_AFTER_SETTLE_MS = 15_000;
const INPUT_INTERVAL_MS = 250;
const FRAME_MS = 1000 / 60;

function scenarioUrl(t: RenderRunTarget, sessionId: string): string {
  const url = new URL(t.baseUrl);
  url.searchParams.set("scenario", t.scenarioId);
  url.searchParams.set("agui", t.harnessUrl);
  url.searchParams.set("session", sessionId);
  url.searchParams.set("allowMediaOrigin", new URL(t.harnessUrl).origin);
  return url.toString();
}

type MetricMap = ReadonlyMap<string, number>;

async function cdpMetrics(cdp: CDPSession | null): Promise<MetricMap | null> {
  if (cdp === null) return null;
  const { metrics } = await cdp.send("Performance.getMetrics");
  return new Map(metrics.map((m) => [m.name, m.value]));
}

function cpuDelta(before: MetricMap | null, after: MetricMap | null): CpuMetrics | null {
  if (before === null || after === null) return null;
  const d = (name: string): number => Math.round(((after.get(name) ?? 0) - (before.get(name) ?? 0)) * 1e4) / 10;
  return { taskMs: d("TaskDuration"), scriptMs: d("ScriptDuration"), layoutMs: d("LayoutDuration"), styleMs: d("RecalcStyleDuration") };
}

export function frameStats(stamps: readonly number[]): FrameStats | null {
  if (stamps.length < 2) return null;
  const deltas = stamps.slice(1).map((s, i) => s - (stamps[i] ?? s));
  const sorted = [...deltas].sort((a, b) => a - b);
  const dropped = deltas.reduce((n, d) => n + Math.max(0, Math.round(d / FRAME_MS) - 1), 0);
  return {
    frames: stamps.length,
    droppedFrames: dropped,
    jankFrames: deltas.filter((d) => d > 50).length,
    maxFrameMs: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
    medianFrameMs: Math.round((sorted[Math.floor(sorted.length / 2)] ?? 0) * 10) / 10,
  };
}

async function runStatus(page: Page): Promise<{ status: string | null; at: number }> {
  return page.evaluate(() => ({ status: window.__spike?.snapshot().runStatus ?? null, at: performance.now() }));
}

async function waitSettled(page: Page): Promise<{ status: RunStatus; at: number }> {
  return page.evaluate(
    ({ settled, timeout }) =>
      new Promise<{ status: RunStatus; at: number }>((resolve, reject) => {
        const started = performance.now();
        const timer = setInterval(() => {
          const status = window.__spike?.snapshot().runStatus;
          if (status !== undefined && settled.includes(status)) {
            clearInterval(timer);
            resolve({ status, at: performance.now() });
          } else if (performance.now() - started > timeout) {
            clearInterval(timer);
            reject(new Error(`run did not settle within ${timeout} ms (status ${status ?? "unknown"})`));
          }
        }, 20);
      }),
    { settled: SETTLED, timeout: SETTLE_TIMEOUT_MS },
  );
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Presses Shift every INPUT_INTERVAL_MS from the first token (or settle) until the run settles. */
async function injectInputs(page: Page, settled: Promise<unknown>): Promise<void> {
  let done = false;
  void settled.then(
    () => (done = true),
    () => (done = true),
  );
  await page.waitForFunction(
    (states) => window.__kmRender?.firstTokenAt !== null || states.includes(window.__spike?.snapshot().runStatus ?? ""),
    SETTLED,
    { polling: 10, timeout: SETTLE_TIMEOUT_MS },
  );
  while (!done) {
    await page.keyboard.press("Shift");
    const { status } = await runStatus(page);
    if (status !== null && SETTLED.includes(status)) break;
    await sleep(INPUT_INTERVAL_MS);
  }
}

interface InPage {
  readonly submitAt: number | null;
  readonly firstTokenAt: number | null;
  readonly mutationCount: number;
  readonly longTasks: readonly { start: number; duration: number }[] | null;
  readonly frames: readonly number[];
  readonly inputs: readonly InputSample[];
  readonly counts: { commits: number; byComponent: Record<string, number>; storeCommits: number } | null;
  readonly domNodes: number;
}

async function readInPage(page: Page): Promise<InPage> {
  return page.evaluate(() => {
    const t = window.__kmRender;
    t?.stop();
    const counts = window.__spike?.renderCounts() ?? null;
    return {
      submitAt: t?.submitAt ?? null,
      firstTokenAt: t?.firstTokenAt ?? null,
      mutationCount: t?.mutationCount ?? 0,
      longTasks: t?.longTaskSupported === true ? t.longTasks : null,
      frames: t?.frames ?? [],
      inputs: t?.inputs ?? [],
      counts: counts === null ? null : { commits: counts.commits, byComponent: { ...counts.byComponent }, storeCommits: counts.storeCommits },
      domNodes: document.getElementsByTagName("*").length,
    };
  });
}

const round = (v: number): number => Math.round(v * 10) / 10;

function assemble(base: Omit<RenderRunResult, "error">, data: {
  inPage: InPage;
  settled: { status: RunStatus; at: number };
  complete: RenderCompleteResult;
  cpu: CpuMetrics | null;
  heap: number | null;
  heapAfterGc: number | null;
}): RenderRunResult {
  const { inPage, settled, complete } = data;
  const submit = inPage.submitAt;
  const end = complete.renderCompleteAt;
  const tasks = inPage.longTasks === null || submit === null ? null : inPage.longTasks.filter((x) => x.start >= submit && x.start <= end);
  const after = tasks?.filter((x) => x.start + x.duration > settled.at) ?? null;
  const frames = submit === null ? [] : inPage.frames.filter((f) => f >= submit && f <= end);
  const inputs = inPage.inputs.filter((s) => s.latency !== null);
  return {
    ...base,
    runStatus: settled.status,
    timeToFirstTokenMs: submit === null || inPage.firstTokenAt === null ? null : round(inPage.firstTokenAt - submit),
    totalStreamMs: submit === null ? null : round(settled.at - submit),
    renderCompleteMs: submit === null ? null : round(end - submit),
    renderLagAfterSettleMs: round(Math.max(0, end - settled.at)),
    renderCompleteTimedOut: complete.timedOut,
    longTaskTotalMs: tasks === null ? null : round(tasks.reduce((s, x) => s + x.duration, 0)),
    longTaskCount: tasks === null ? null : tasks.length,
    longTaskAfterSettleMs: after === null ? null : round(after.reduce((s, x) => s + Math.min(x.duration, x.start + x.duration - settled.at), 0)),
    cpu: data.cpu,
    frameStats: frameStats(frames),
    inputLatencyMs: inputs.map((s) => round(s.latency ?? 0)),
    inputLatencyInStreamMs: inputs.filter((s) => s.at < settled.at).map((s) => round(s.latency ?? 0)),
    eventTimingDurationsMs: inPage.inputs.flatMap((s) => (s.eventTimingDuration === null ? [] : [s.eventTimingDuration])),
    reactCommits: inPage.counts?.commits ?? null,
    componentRenders: inPage.counts === null ? null : Object.values(inPage.counts.byComponent).reduce((s, n) => s + n, 0),
    storeCommits: inPage.counts?.storeCommits ?? null,
    mutationCount: inPage.mutationCount,
    jsHeapUsedBytes: data.heap,
    jsHeapUsedAfterGcBytes: data.heapAfterGc,
    domNodes: inPage.domNodes,
    error: null,
  };
}

function emptyResult(t: RenderRunTarget, sessionId: string): Omit<RenderRunResult, "error"> {
  return {
    prototype: t.prototype, browser: t.browser, scenarioId: t.scenarioId, repeat: t.repeat, sessionId,
    startedAt: new Date().toISOString(), loadavg1: Math.round((loadavg()[0] ?? 0) * 100) / 100,
    runStatus: null, timeToFirstTokenMs: null, totalStreamMs: null, renderCompleteMs: null, renderLagAfterSettleMs: null,
    renderCompleteTimedOut: null, longTaskTotalMs: null, longTaskCount: null, longTaskAfterSettleMs: null, cpu: null,
    frameStats: null, inputLatencyMs: [], inputLatencyInStreamMs: [], eventTimingDurationsMs: [], reactCommits: null,
    componentRenders: null, storeCommits: null, mutationCount: null, jsHeapUsedBytes: null, jsHeapUsedAfterGcBytes: null, domNodes: null,
  };
}

async function measure(page: Page, cdp: CDPSession | null, t: RenderRunTarget, base: Omit<RenderRunResult, "error">): Promise<RenderRunResult> {
  await page.waitForFunction(() => window.__spike?.ready === true, undefined, { timeout: 30_000 });
  await page.evaluate(() => window.__spike?.resetRenderCounts());
  await page.getByTestId("km-composer-input").fill(t.userPrompt);
  if (cdp !== null) await cdp.send("HeapProfiler.collectGarbage");
  const before = await cdpMetrics(cdp);
  await page.getByTestId("km-composer-submit").click();
  const settledPromise = waitSettled(page);
  // Input injection must never outlive or crash the run: its errors are recorded, not thrown.
  const inputs = injectInputs(page, settledPromise).catch((error: unknown) => error);
  const settled = await settledPromise;
  const inputError = await inputs;
  if (inputError instanceof Error) throw inputError;
  const complete = await page.evaluate(
    ({ at, quiet, max }) => window.__kmRender?.waitRenderComplete(at, quiet, max) ?? Promise.reject(new Error("no timeline")),
    { at: settled.at, quiet: QUIET_MS, max: RENDER_MAX_AFTER_SETTLE_MS },
  );
  const after = await cdpMetrics(cdp);
  const inPage = await readInPage(page);
  const heap = after?.get("JSHeapUsedSize") ?? null;
  if (cdp !== null) await cdp.send("HeapProfiler.collectGarbage");
  const heapAfterGc = (await cdpMetrics(cdp))?.get("JSHeapUsedSize") ?? null;
  return assemble(base, { inPage, settled, complete, cpu: cpuDelta(before, after), heap, heapAfterGc });
}

export async function renderRun(browser: Browser, t: RenderRunTarget): Promise<RenderRunResult> {
  const sessionId = `m163-${t.prototype}-${t.browser}-${t.scenarioId.replace(/[^a-z0-9]+/gi, "-")}-${t.repeat}-${Date.now().toString(36)}`;
  const base = emptyResult(t, sessionId);
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    await page.addInitScript(installRenderTimeline);
    const cdp = t.browser === "chromium" ? await context.newCDPSession(page) : null;
    if (cdp !== null) await cdp.send("Performance.enable");
    await page.goto(scenarioUrl(t, sessionId), { waitUntil: "load" });
    return await measure(page, cdp, t, base);
  } catch (error: unknown) {
    return { ...base, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await context?.close();
  }
}
