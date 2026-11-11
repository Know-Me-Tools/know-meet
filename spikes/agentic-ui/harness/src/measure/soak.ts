/**
 * Gate 16.3 long-session memory soak (Chromium, CDP heap).
 *
 *   node src/measure/soak.ts --url <prototype-url> --prototype hybrid|own --out <file> [--minutes 30] [--think-ms 5000]
 *
 * One page, one session, for the whole soak: the composer is submitted again and again. Each POST to
 * /agui/<scenario> is rerouted (Playwright route.continue with a new URL) to the next scenario of a
 * fixed cycle, with a fresh server session id, so the transcript keeps growing as in a long meeting.
 * Every minute, at the first run boundary after the mark, it forces a GC and records JSHeapUsedSize,
 * DOM nodes, transcript messages, completed runs and the 1-minute load average. Between turns it
 * waits --think-ms (user think time), so idle-time growth (timers, retained closures) shows as well.
 */
import { writeFileSync } from "node:fs";
import { loadavg } from "node:os";
import { chromium, type CDPSession, type Page } from "@playwright/test";
import { olsSlope } from "./paired-stats.ts";

const CYCLE = ["long-markdown", "parallel-tool-calls", "custom-chunks", "state-snapshot-delta", "reasoning-subagents-snapshot", "hostile/huge-table"];
const SETTLED = ["finished", "interrupted", "cancelled", "error"];
const QUIET_AFTER_SETTLE_MS = 300;

interface Sample {
  readonly minute: number;
  readonly elapsedMs: number;
  readonly heapAfterGcBytes: number;
  readonly domNodes: number;
  readonly messages: number;
  readonly runsCompleted: number;
  readonly loadavg1: number;
}

interface RunRecord {
  readonly index: number;
  readonly scenarioId: string;
  readonly status: string;
  readonly durationMs: number;
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? process.argv[i + 1] : fallback;
  if (v === undefined) throw new Error(`${name} is required`);
  return v;
}

async function heap(cdp: CDPSession): Promise<number> {
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0;
}

async function settle(page: Page): Promise<string> {
  return page.evaluate(
    (states) =>
      new Promise<string>((resolve, reject) => {
        const started = performance.now();
        const timer = setInterval(() => {
          const status = window.__spike?.snapshot().runStatus ?? "";
          if (states.includes(status)) {
            clearInterval(timer);
            resolve(status);
          } else if (performance.now() - started > 300_000) {
            clearInterval(timer);
            reject(new Error(`run did not settle (status ${status})`));
          }
        }, 20);
      }),
    SETTLED,
  );
}

async function main(): Promise<void> {
  const url = arg("--url");
  const prototype = arg("--prototype");
  const out = arg("--out");
  const minutes = Number(arg("--minutes", "30"));
  const thinkMs = Number(arg("--think-ms", "5000"));
  const harnessUrl = arg("--harness", "http://127.0.0.1:4317").replace(/\/$/, "");
  const prompts = new Map<string, string>();
  for (const id of CYCLE) {
    const body = (await (await fetch(`${harnessUrl}/scenarios/${encodeURI(id)}`)).json()) as { scenario: { userPrompt: string } };
    prompts.set(id, body.scenario.userPrompt);
  }
  const browser = await chromium.launch({ headless: true });
  const samples: Sample[] = [];
  const runs: RunRecord[] = [];
  const startedAt = new Date().toISOString();
  let posts = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const tag = Date.now().toString(36);
    await page.route(/\/agui\//, async (route) => {
      const request = route.request();
      if (request.method() !== "POST") return route.continue();
      const target = new URL(request.url());
      const scenario = CYCLE[posts % CYCLE.length] ?? "long-markdown";
      target.pathname = `/agui/${encodeURI(scenario)}`;
      target.searchParams.set("session", `soak-${prototype}-${tag}-${posts}`);
      posts += 1;
      return route.continue({ url: target.toString() });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const first = new URL(url);
    first.searchParams.set("scenario", CYCLE[0] ?? "long-markdown");
    first.searchParams.set("agui", harnessUrl);
    first.searchParams.set("session", `soak-${prototype}-${tag}`);
    first.searchParams.set("allowMediaOrigin", new URL(harnessUrl).origin);
    await page.goto(first.toString(), { waitUntil: "load" });
    await page.waitForFunction(() => window.__spike?.ready === true, undefined, { timeout: 30_000 });
    const t0 = Date.now();
    const sample = async (minute: number): Promise<void> => {
      const heapAfterGcBytes = await heap(cdp);
      const dom = await page.evaluate(() => ({
        domNodes: document.getElementsByTagName("*").length,
        messages: window.__spike?.snapshot().messages.length ?? 0,
      }));
      const s: Sample = { minute, elapsedMs: Date.now() - t0, heapAfterGcBytes, ...dom, runsCompleted: runs.length, loadavg1: loadavg()[0] ?? 0 };
      samples.push(s);
      process.stdout.write(`${prototype} min ${minute}: heap ${(heapAfterGcBytes / 1e6).toFixed(1)} MB, dom ${dom.domNodes}, runs ${runs.length}\n`);
    };
    await sample(0);
    let nextMinute = 1;
    while (Date.now() - t0 < minutes * 60_000) {
      const scenarioId = CYCLE[runs.length % CYCLE.length] ?? "long-markdown";
      const started = Date.now();
      await page.getByTestId("km-composer-input").fill(prompts.get(scenarioId) ?? "go", { timeout: 60_000 });
      await page.getByTestId("km-composer-submit").click({ timeout: 60_000 });
      const status = await settle(page);
      await page.waitForTimeout(QUIET_AFTER_SETTLE_MS);
      runs.push({ index: runs.length, scenarioId, status, durationMs: Date.now() - started });
      await page.waitForTimeout(thinkMs);
      while (Date.now() - t0 >= nextMinute * 60_000 && nextMinute <= minutes) {
        await sample(nextMinute);
        nextMinute += 1;
      }
    }
    if (samples.at(-1)?.minute !== minutes) await sample(minutes);
  } finally {
    await browser.close();
  }
  const xs = samples.map((s) => s.elapsedMs / 60_000);
  const mb = samples.map((s) => s.heapAfterGcBytes / 1e6);
  const perRun = olsSlope(samples.map((s) => s.runsCompleted), mb);
  const report = {
    schemaVersion: 1, gate: "16.3", prototype, url, startedAt, finishedAt: new Date().toISOString(), minutes, thinkMs, cycle: CYCLE,
    method: "single page and session; POSTs rerouted to the next cycle scenario with a fresh server session id; forced GC before every heap sample",
    slopeMbPerMinute: olsSlope(xs, mb),
    slopeMbPerRun: perRun,
    samples,
    runs,
  };
  writeFileSync(out, `${JSON.stringify(report, null, 1)}\n`);
  process.stdout.write(`wrote ${out}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
