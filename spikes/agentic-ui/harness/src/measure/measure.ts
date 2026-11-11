/**
 * Measurement: `pnpm measure --url <prototype-url> --prototype <name> [--dist <dir>]`.
 * Writes reports/measure-<name>.json. See README.md "Measure".
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { arch, platform, release } from "node:os";
import { join } from "node:path";
import { chromium, webkit, type Browser } from "@playwright/test";
import { A2UI_WEB_CORE_PACKAGE, AG_UI_CORE_PACKAGE, CORPUS_FORMAT_VERSION } from "../domain/versions.ts";
import { startHarnessServer, type RunningHarness } from "../server/app.ts";
import { REPORTS_DIR } from "../shared/paths.ts";
import { parseArgs, type ParsedArgs } from "./args.ts";
import { measureBundle, type BundleReport } from "./bundle-size.ts";
import { measureRun, type RunMetrics, type ScenarioTarget } from "./scenario-run.ts";

const DEFAULT_EXTRA_SCENARIOS = ["hostile/huge-table"];
const MEDIAN_FIELDS = [
  "timeToFirstTokenMs",
  "totalStreamMs",
  "reactCommits",
  "storeCommits",
  "longTaskTotalMs",
  "longTaskCount",
  "jsHeapUsedBytes",
  "jsHeapUsedAfterGcBytes",
  "domNodes",
] as const;

type MedianField = (typeof MEDIAN_FIELDS)[number];

interface ScenarioSummaryRow {
  readonly id: string;
  readonly userPrompt: string;
  readonly runs: readonly RunMetrics[];
  readonly median: Readonly<Record<MedianField, number | null>>;
  readonly failures: number;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

async function ensureHarness(harnessUrl: string): Promise<RunningHarness | null> {
  try {
    await getJson<unknown>(`${harnessUrl}/healthz`);
    return null;
  } catch {
    const url = new URL(harnessUrl);
    const port = Number(url.port || "80");
    process.stdout.write(`no harness at ${harnessUrl}; starting one in-process\n`);
    return startHarnessServer({ host: url.hostname, port, evilPort: port + 1 });
  }
}

async function targets(args: ParsedArgs): Promise<ScenarioTarget[]> {
  let ids = args.scenarios;
  if (ids === null) {
    const { scenarios } = await getJson<{ scenarios: { id: string; family: string; interactions: number }[] }>(`${args.harnessUrl}/scenarios`);
    ids = [...scenarios.filter((s) => s.family === "ag-ui" && s.interactions === 0).map((s) => s.id), ...DEFAULT_EXTRA_SCENARIOS];
  }
  return Promise.all(
    ids.map(async (id) => {
      const { scenario } = await getJson<{ scenario: { userPrompt: string } }>(`${args.harnessUrl}/scenarios/${encodeURI(id)}`);
      return { id, userPrompt: scenario.userPrompt };
    }),
  );
}

export function median(values: readonly (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  const value = nums.length % 2 === 1 ? nums[mid] : ((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2;
  return value === undefined ? null : Math.round(value * 10) / 10;
}

function summarize(target: ScenarioTarget, runs: RunMetrics[]): ScenarioSummaryRow {
  const ok = runs.filter((r) => r.error === null);
  const med = {} as Record<MedianField, number | null>;
  for (const field of MEDIAN_FIELDS) med[field] = median(ok.map((r) => r[field]));
  return { id: target.id, userPrompt: target.userPrompt, runs, median: med, failures: runs.length - ok.length };
}

async function measureScenarios(args: ParsedArgs): Promise<{ rows: ScenarioSummaryRow[]; browserVersion: string }> {
  const launcher = args.browser === "webkit" ? webkit : chromium;
  const browser: Browser = await launcher.launch({ headless: !args.headed });
  try {
    const rows: ScenarioSummaryRow[] = [];
    for (const target of await targets(args)) {
      const runs: RunMetrics[] = [];
      for (let repeat = 1; repeat <= args.repeats; repeat += 1) {
        const run = await measureRun(browser, args, target, repeat);
        runs.push(run);
        const label = run.error === null ? `ttft ${run.timeToFirstTokenMs?.toFixed(0) ?? "-"} ms, total ${run.totalStreamMs?.toFixed(0) ?? "-"} ms, commits ${run.reactCommits ?? "-"}` : `ERROR ${run.error}`;
        process.stdout.write(`${target.id} #${repeat}: ${label}\n`);
      }
      rows.push(summarize(target, runs));
    }
    return { rows, browserVersion: `${args.browser} ${browser.version()}` };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const bundle: BundleReport | null = args.dist === null ? null : measureBundle(args.dist);
  let harness: RunningHarness | null = null;
  let scenarios: { rows: ScenarioSummaryRow[]; browserVersion: string } | null = null;
  try {
    if (!args.distOnly) {
      harness = await ensureHarness(args.harnessUrl);
      scenarios = await measureScenarios(args);
    }
  } finally {
    await harness?.close();
  }
  const report = {
    schemaVersion: 1,
    prototype: args.prototype,
    url: args.url || null,
    measuredAt: new Date().toISOString(),
    environment: { node: process.version, os: `${platform()} ${release()} ${arch()}`, browser: scenarios?.browserVersion ?? null },
    harness: { agUiCore: AG_UI_CORE_PACKAGE, a2uiWebCore: A2UI_WEB_CORE_PACKAGE, corpusFormat: CORPUS_FORMAT_VERSION, url: args.harnessUrl },
    settings: { repeats: args.repeats, rate: args.rate, gap: args.gap, browser: args.browser },
    notes: [
      "Times are performance.now() ms in the page; totalStreamMs has 20 ms resolution.",
      "Interactive scenarios are measured up to their first settle (no approvals/clicks).",
      args.browser === "webkit" ? "WebKit: no CDP, so heap and long-task fields are null." : "Heap via CDP Performance.getMetrics (JSHeapUsedSize), before and after HeapProfiler.collectGarbage.",
    ],
    scenarios: scenarios?.rows ?? [],
    bundle,
  };
  mkdirSync(REPORTS_DIR, { recursive: true });
  const out = join(REPORTS_DIR, `measure-${args.prototype}.json`);
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  if (bundle !== null) process.stdout.write(`bundle: ${bundle.totals.files} files, raw ${bundle.totals.raw} B, gzip ${bundle.totals.gzip} B, brotli ${bundle.totals.brotli} B\n`);
  process.stdout.write(`wrote ${out}\n`);
  const failures = report.scenarios.reduce((n, s) => n + s.failures, 0);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
