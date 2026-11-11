/** Measures one scenario run in a fresh browser context. */
import type { Browser, BrowserContext, CDPSession, Page } from "@playwright/test";
import type { RunStatus } from "../domain/spike-probe.ts";
import type { MeasureArgs } from "./args.ts";
import { installTimeline } from "./page-timeline.ts";

export interface RunMetrics {
  readonly scenarioId: string;
  readonly repeat: number;
  readonly sessionId: string;
  readonly runStatus: RunStatus | null;
  /** Submit click to first assistant text in the DOM. */
  readonly timeToFirstTokenMs: number | null;
  /** Submit click to the run settling (finished/interrupted/cancelled/error), 20 ms resolution. */
  readonly totalStreamMs: number | null;
  readonly reactCommits: number | null;
  readonly storeCommits: number | null;
  readonly rendersByComponent: Readonly<Record<string, number>> | null;
  readonly longTaskTotalMs: number | null;
  readonly longTaskCount: number | null;
  readonly jsHeapUsedBytes: number | null;
  readonly jsHeapUsedAfterGcBytes: number | null;
  readonly domNodes: number | null;
  readonly error: string | null;
}

export interface ScenarioTarget {
  readonly id: string;
  readonly userPrompt: string;
}

const SETTLED = ["finished", "interrupted", "cancelled", "error"];
const SETTLE_TIMEOUT_MS = 180_000;

function scenarioUrl(args: MeasureArgs, scenarioId: string, sessionId: string): string {
  const url = new URL(args.url);
  url.searchParams.set("scenario", scenarioId);
  url.searchParams.set("agui", args.harnessUrl);
  url.searchParams.set("session", sessionId);
  url.searchParams.set("allowMediaOrigin", new URL(args.harnessUrl).origin);
  if (args.rate !== null) url.searchParams.set("rate", args.rate);
  if (args.gap !== null) url.searchParams.set("gap", args.gap);
  return url.toString();
}

async function heapUsed(cdp: CDPSession | null): Promise<number | null> {
  if (cdp === null) return null;
  const { metrics } = await cdp.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? null;
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

async function collect(page: Page, cdp: CDPSession | null, target: ScenarioTarget, repeat: number, sessionId: string): Promise<RunMetrics> {
  await page.waitForFunction(() => window.__spike?.ready === true, undefined, { timeout: 30_000 });
  await page.evaluate(() => window.__spike?.resetRenderCounts());
  await page.getByTestId("km-composer-input").fill(target.userPrompt);
  await page.getByTestId("km-composer-submit").click();
  const settled = await waitSettled(page);
  const inPage = await page.evaluate(() => {
    const t = window.__kmTimeline;
    const counts = window.__spike?.renderCounts();
    const since = t?.submitAt ?? 0;
    const tasks = t?.longTaskSupported === true ? t.longTasks.filter((x) => x.start >= since) : null;
    return {
      submitAt: t?.submitAt ?? null,
      firstTokenAt: t?.firstTokenAt ?? null,
      counts: counts ?? null,
      longTaskTotal: tasks === null ? null : tasks.reduce((s, x) => s + x.duration, 0),
      longTaskCount: tasks === null ? null : tasks.length,
      domNodes: document.getElementsByTagName("*").length,
    };
  });
  const heapBefore = await heapUsed(cdp);
  if (cdp !== null) await cdp.send("HeapProfiler.collectGarbage");
  const heapAfter = await heapUsed(cdp);
  const submitAt = inPage.submitAt;
  return {
    scenarioId: target.id,
    repeat,
    sessionId,
    runStatus: settled.status,
    timeToFirstTokenMs: submitAt === null || inPage.firstTokenAt === null ? null : inPage.firstTokenAt - submitAt,
    totalStreamMs: submitAt === null ? null : settled.at - submitAt,
    reactCommits: inPage.counts?.commits ?? null,
    storeCommits: inPage.counts?.storeCommits ?? null,
    rendersByComponent: inPage.counts?.byComponent ?? null,
    longTaskTotalMs: inPage.longTaskTotal,
    longTaskCount: inPage.longTaskCount,
    jsHeapUsedBytes: heapBefore,
    jsHeapUsedAfterGcBytes: heapAfter,
    domNodes: inPage.domNodes,
    error: null,
  };
}

function failed(target: ScenarioTarget, repeat: number, sessionId: string, error: unknown): RunMetrics {
  return {
    scenarioId: target.id,
    repeat,
    sessionId,
    runStatus: null,
    timeToFirstTokenMs: null,
    totalStreamMs: null,
    reactCommits: null,
    storeCommits: null,
    rendersByComponent: null,
    longTaskTotalMs: null,
    longTaskCount: null,
    jsHeapUsedBytes: null,
    jsHeapUsedAfterGcBytes: null,
    domNodes: null,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function measureRun(browser: Browser, args: MeasureArgs, target: ScenarioTarget, repeat: number): Promise<RunMetrics> {
  const sessionId = `measure-${args.prototype}-${target.id.replace(/[^a-z0-9]+/gi, "-")}-${repeat}-${Date.now().toString(36)}`;
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(installTimeline);
    const cdp = args.browser === "chromium" ? await context.newCDPSession(page) : null;
    if (cdp !== null) await cdp.send("Performance.enable");
    await page.goto(scenarioUrl(args, target.id, sessionId), { waitUntil: "load" });
    return await collect(page, cdp, target, repeat, sessionId);
  } catch (error: unknown) {
    return failed(target, repeat, sessionId, error);
  } finally {
    await context?.close();
  }
}
