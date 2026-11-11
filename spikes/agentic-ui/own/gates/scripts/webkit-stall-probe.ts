/**
 * Gate 16.3 follow-up: locate O's ~1 s WebKit frame gap on the long 20 KB streams.
 *
 *   node gates/scripts/webkit-stall-probe.ts --url http://127.0.0.1:4296/ [--scenario long-markdown]
 *     [--runs 3] [--browser webkit] [--out gates/raw/16-3-followup/probe-<label>.json] [--label x] [--fresh-browser 1]
 *
 * One fresh context per run. An init script records, from page load:
 *   - every requestAnimationFrame timestamp (frame gaps);
 *   - a 10 ms setTimeout heartbeat (a gap in heartbeats too means the main thread was blocked; frames
 *     missing while heartbeats continue means only rendering stalled);
 *   - resource-timing entries (lazy chunks: Shiki, KaTeX, Mermaid, languages, themes);
 *   - the streamed text length (`.km-md` textContent) at every heartbeat;
 *   - `performance.mark`/`measure` entries the page itself emits (diagnostic builds only).
 * For the largest frame gap it reports what started and finished around it.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(resolve(import.meta.dirname, "../../../harness/package.json"));
const pw = require("@playwright/test") as typeof import("@playwright/test");

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i] ?? "", process.argv[i + 1] ?? "");
const url = args.get("--url") ?? "http://127.0.0.1:4296/";
const scenario = args.get("--scenario") ?? "long-markdown";
const runs = Number(args.get("--runs") ?? "3");
const browserName = (args.get("--browser") ?? "webkit") as "webkit" | "chromium";
const label = args.get("--label") ?? "probe";
const out = args.get("--out") ?? resolve(import.meta.dirname, `../raw/16-3-followup/probe-${label}-${browserName}-${scenario.replace(/\W+/g, "-")}.json`);
const harness = "http://127.0.0.1:4317";

function install(): void {
  const w = window as unknown as { __probe: Record<string, unknown> };
  const p = { frames: [] as number[], beats: [] as [number, number][], marks: [] as [string, number, number][], submitAt: null as number | null };
  w.__probe = p;
  const frame = (t: number): void => {
    p.frames.push(t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const beat = (): void => {
    const md = document.querySelectorAll(".km-md");
    let len = 0;
    md.forEach((n) => (len += n.textContent?.length ?? 0));
    p.beats.push([performance.now(), len]);
    setTimeout(beat, 10);
  };
  setTimeout(beat, 10);
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) p.marks.push([`${e.entryType}:${e.name}`, e.startTime, e.duration]);
  }).observe({ entryTypes: ["mark", "measure"] });
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('[data-testid="km-composer-submit"]') && p.submitAt === null) p.submitAt = performance.now();
    },
    true,
  );
}

interface Gap {
  readonly start: number;
  readonly end: number;
  readonly ms: number;
}

async function oneRun(browser: import("@playwright/test").Browser, i: number): Promise<unknown> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.addInitScript(install);
  const prompt = ((await (await fetch(`${harness}/scenarios/${scenario}`)).json()) as { scenario: { userPrompt: string } }).scenario.userPrompt;
  const session = `probe-${label}-${i}-${Date.now().toString(36)}`;
  const u = new URL(url);
  u.searchParams.set("scenario", scenario);
  u.searchParams.set("agui", harness);
  u.searchParams.set("session", session);
  u.searchParams.set("allowMediaOrigin", harness);
  await page.goto(u.toString(), { waitUntil: "load" });
  await page.waitForFunction(() => (window as unknown as { __spike?: { ready?: boolean } }).__spike?.ready === true, undefined, { timeout: 30_000 });
  await page.getByTestId("km-composer-input").fill(prompt);
  await page.getByTestId("km-composer-submit").click();
  await page.waitForFunction(
    () => ["finished", "interrupted", "cancelled", "error"].includes((window as unknown as { __spike: { snapshot(): { runStatus: string } } }).__spike.snapshot().runStatus),
    undefined,
    { timeout: 180_000, polling: 50 },
  );
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const w = window as unknown as { __probe: { frames: number[]; beats: [number, number][]; marks: [string, number, number][]; submitAt: number | null } };
    const res = performance.getEntriesByType("resource").map((e) => {
      const r = e as PerformanceResourceTiming;
      return { name: r.name.replace(/^https?:\/\/[^/]+/, ""), start: r.startTime, end: r.responseEnd, size: r.transferSize };
    });
    return { ...w.__probe, resources: res };
  });
  await context.close();
  const submit = data.submitAt ?? 0;
  const frames = data.frames.filter((f) => f >= submit);
  const gaps: Gap[] = frames.slice(1).map((f, k) => ({ start: frames[k] ?? f, end: f, ms: f - (frames[k] ?? f) })).sort((a, b) => b.ms - a.ms);
  const top = gaps.slice(0, 3);
  const g = top[0];
  const beatsIn = g === undefined ? [] : data.beats.filter(([t]) => t > g.start && t < g.end);
  const beatGaps = data.beats.slice(1).map(([t], k) => ({ start: data.beats[k]?.[0] ?? t, ms: t - (data.beats[k]?.[0] ?? t) })).sort((a, b) => b.ms - a.ms).slice(0, 3);
  const near = (t: number): boolean => g !== undefined && t > g.start - 300 && t < g.end + 50;
  const lenAt = (t: number): number => {
    let len = 0;
    for (const [bt, l] of data.beats) if (bt <= t) len = l;
    return len;
  };
  const rel = (t: number): number => Math.round(t - submit);
  return {
    run: i,
    topFrameGaps: top.map((x) => ({ startRel: rel(x.start), ms: Math.round(x.ms), textLenAtStart: lenAt(x.start) })),
    heartbeatsInsideLargestGap: beatsIn.length,
    topHeartbeatGaps: beatGaps.map((x) => ({ startRel: rel(x.start), ms: Math.round(x.ms) })),
    resourcesAfterSubmit: data.resources.filter((r) => r.start >= submit).map((r) => ({ ...r, start: rel(r.start), end: rel(r.end) })),
    marksNearGap: data.marks.filter(([, t]) => near(t)).map(([n, t, d]) => ({ n, at: rel(t), d: Math.round(d) })),
    finalTextLen: data.beats.at(-1)?.[1] ?? 0,
  };
}

const fresh = args.get("--fresh-browser") === "1";
let browser = await pw[browserName].launch({ headless: true });
const results: unknown[] = [];
for (let i = 1; i <= runs; i++) {
  if (fresh && i > 1) {
    await browser.close();
    browser = await pw[browserName].launch({ headless: true });
  }
  const r = await oneRun(browser, i);
  results.push(r);
  console.log(JSON.stringify(r));
}
await browser.close();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ label, url, scenario, browser: browserName, at: new Date().toISOString(), results }, null, 2));
console.log(`wrote ${out}`);
