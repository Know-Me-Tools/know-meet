/**
 * Gate 16.3 summariser: reads measurements/raw/16-3/*.json and writes summary.json next to them, and
 * prints Markdown tables (stdout) for 16-3-remeasure.md.
 *
 *   node src/measure/paired-report.ts <raw-dir>
 *
 * Paired difference = O minus H for the same scenario, browser and repetition (both runs of a pair
 * are adjacent in time). "Meaningful" = the 95% percentile-bootstrap CI of the median paired
 * difference excludes 0. Quantiles are linear-interpolation (type 7).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RenderRunResult } from "./render-run.ts";
import { pairedDifference, quantile, type PairedSummary, type Slope } from "./paired-stats.ts";

interface RawReport {
  readonly label: string;
  readonly browser: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly runs: readonly RenderRunResult[];
}

interface MetricDef {
  readonly key: string;
  readonly title: string;
  readonly unit: string;
  readonly engines: readonly ("chromium" | "webkit")[];
  readonly pick: (r: RenderRunResult) => number | null;
}

const ms = (v: number | null | undefined): number | null => (v === undefined ? null : v);
const p50 = (xs: readonly number[]): number | null => quantile(xs, 0.5);
const max = (xs: readonly number[]): number | null => (xs.length === 0 ? null : Math.max(...xs));

export const METRICS: readonly MetricDef[] = [
  { key: "renderComplete", title: "Submit to render-complete", unit: "ms", engines: ["chromium", "webkit"], pick: (r) => r.renderCompleteMs },
  { key: "renderLag", title: "Render lag after settle", unit: "ms", engines: ["chromium", "webkit"], pick: (r) => r.renderLagAfterSettleMs },
  { key: "ttft", title: "Time to first token", unit: "ms", engines: ["chromium", "webkit"], pick: (r) => r.timeToFirstTokenMs },
  { key: "longTasks", title: "Long-task total, submit to render-complete", unit: "ms", engines: ["chromium"], pick: (r) => r.longTaskTotalMs },
  { key: "taskTime", title: "Main-thread task time (CDP TaskDuration)", unit: "ms", engines: ["chromium"], pick: (r) => ms(r.cpu?.taskMs) },
  { key: "scriptTime", title: "Scripting time (CDP ScriptDuration)", unit: "ms", engines: ["chromium"], pick: (r) => ms(r.cpu?.scriptMs) },
  { key: "dropped", title: "Dropped frames (rAF deltas, 60 Hz)", unit: "frames", engines: ["chromium", "webkit"], pick: (r) => r.frameStats?.droppedFrames ?? null },
  { key: "inputP50", title: "Input latency, per-run median (keydown to next paint, in-stream)", unit: "ms", engines: ["chromium", "webkit"], pick: (r) => p50(r.inputLatencyInStreamMs) },
  { key: "inputMax", title: "Input latency, per-run worst (in-stream)", unit: "ms", engines: ["chromium", "webkit"], pick: (r) => max(r.inputLatencyInStreamMs) },
  { key: "heap", title: "JS heap after forced GC at render-complete", unit: "MB", engines: ["chromium"], pick: (r) => (r.jsHeapUsedAfterGcBytes === null ? null : r.jsHeapUsedAfterGcBytes / 1e6) },
];

interface Cell {
  readonly scenarioId: string;
  readonly h: { n: number; median: number | null; p90: number | null; p95: number | null };
  readonly o: { n: number; median: number | null; p90: number | null; p95: number | null };
  readonly diff: PairedSummary;
}

function stats(xs: readonly number[]): Cell["h"] {
  return { n: xs.length, median: quantile(xs, 0.5), p90: quantile(xs, 0.9), p95: quantile(xs, 0.95) };
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function cells(report: RawReport, metric: MetricDef, scenarios: readonly string[]): Cell[] {
  const ok = report.runs.filter((r) => r.error === null);
  return scenarios.map((scenarioId) => {
    const of = (p: "hybrid" | "own"): RenderRunResult[] => ok.filter((r) => r.scenarioId === scenarioId && r.prototype === p);
    const value = (r: RenderRunResult): number | null => {
      const v = metric.pick(r);
      return v === null || !Number.isFinite(v) ? null : v;
    };
    const hs = of("hybrid");
    const os = of("own");
    const diffs: number[] = [];
    for (const h of hs) {
      const o = os.find((x) => x.repeat === h.repeat);
      const a = value(h);
      const b = o === undefined ? null : value(o);
      if (a !== null && b !== null) diffs.push(b - a);
    }
    return {
      scenarioId,
      h: stats(hs.flatMap((r) => value(r) ?? [])),
      o: stats(os.flatMap((r) => value(r) ?? [])),
      diff: pairedDifference(diffs, seedOf(`${report.browser}|${metric.key}|${scenarioId}`)),
    };
  });
}

function fmt(v: number | null, digits = 0): string {
  if (v === null) return "n/m";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function table(metric: MetricDef, rows: readonly Cell[]): string {
  const d = metric.unit === "MB" ? 1 : 0;
  const lines = [
    `| Scenario | H med / p90 / p95 | O med / p90 / p95 | O − H median [95% CI] | O>H / O<H | n | |`,
    `|---|---|---|---|---|---|---|`,
  ];
  for (const c of rows) {
    const ci = c.diff.ciLow === null ? "" : ` [${fmt(c.diff.ciLow, d)}, ${fmt(c.diff.ciHigh, d)}]`;
    lines.push(
      `| \`${c.scenarioId}\` | ${fmt(c.h.median, d)} / ${fmt(c.h.p90, d)} / ${fmt(c.h.p95, d)} | ${fmt(c.o.median, d)} / ${fmt(c.o.p90, d)} / ${fmt(c.o.p95, d)} | ${fmt(c.diff.medianDiff, d)}${ci} | ${c.diff.positive} / ${c.diff.negative} | ${c.diff.n} | ${c.diff.meaningful ? "**M**" : ""} |`,
    );
  }
  return lines.join("\n");
}

function load(dir: string, name: string): RawReport | null {
  const file = join(dir, name);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as RawReport) : null;
}

const pairKey = (r: RenderRunResult): string => `${r.scenarioId}|${r.repeat}`;

/**
 * Applies `<label>-rerun-<engine>.json` (re-runs of pairs invalidated by an environment incident):
 * every pair present in the re-run file replaces both runs of that pair in the original file.
 */
function withReruns(dir: string, label: string, engine: string): { report: RawReport; replaced: RenderRunResult[] } | null {
  const report = load(dir, `${label}-${engine}.json`);
  if (report === null) return null;
  const rerun = load(dir, `${label}-rerun-${engine}.json`);
  if (rerun === null) return { report, replaced: [] };
  const keys = new Set(rerun.runs.map(pairKey));
  const replaced = report.runs.filter((r) => keys.has(pairKey(r)));
  return { report: { ...report, runs: [...report.runs.filter((r) => !keys.has(pairKey(r))), ...rerun.runs] }, replaced };
}

interface SoakReport {
  readonly prototype: string;
  readonly minutes: number;
  readonly slopeMbPerMinute: Slope;
  readonly slopeMbPerRun: Slope;
  readonly samples: readonly { minute: number; heapAfterGcBytes: number; domNodes: number; messages: number; runsCompleted: number; loadavg1: number }[];
  readonly runs: readonly { status: string; durationMs: number }[];
}

function main(): void {
  const dir = process.argv[2];
  if (dir === undefined) throw new Error("usage: paired-report.ts <raw-dir>");
  const out: Record<string, unknown> = {};
  const md: string[] = [];
  for (const engine of ["chromium", "webkit"] as const) {
    const merged = withReruns(dir, "noprof", engine);
    if (merged === null) continue;
    const { report, replaced } = merged;
    const scenarios = [...new Set(report.runs.map((r) => r.scenarioId))].sort();
    const loads = report.runs.map((r) => r.loadavg1);
    const errors = report.runs.filter((r) => r.error !== null);
    const timedOut = report.runs.filter((r) => r.renderCompleteTimedOut === true).length;
    out[engine] = { browser: report.browser, replacedRuns: replaced.map((r) => ({ prototype: r.prototype, scenarioId: r.scenarioId, repeat: r.repeat, runStatus: r.runStatus, error: r.error, startedAt: r.startedAt })), runs: report.runs.length, errors: errors.length, timedOut, loadavg1: { min: Math.min(...loads), median: quantile(loads, 0.5), max: Math.max(...loads) } };
    md.push(`### ${report.browser}: ${report.runs.length} runs, ${errors.length} errors, ${timedOut} render-complete timeouts, load avg (1 min) ${fmt(Math.min(...loads), 1)}–${fmt(Math.max(...loads), 1)} (median ${fmt(quantile(loads, 0.5), 1)})\n`);
    for (const e of errors) md.push(`- error: ${e.prototype} ${e.scenarioId} r${e.repeat}: ${e.error ?? ""}`);
    for (const r of replaced) md.push(`- replaced by re-run: ${r.prototype} ${r.scenarioId} r${r.repeat} (was ${r.runStatus ?? "no status"}${r.error === null ? "" : `, ${r.error}`})`);
    const perMetric: Record<string, Cell[]> = {};
    for (const metric of METRICS.filter((m) => m.engines.includes(engine))) {
      const rows = cells(report, metric, scenarios);
      perMetric[metric.key] = rows;
      md.push(`\n#### ${engine}: ${metric.title} (${metric.unit})\n\n${table(metric, rows)}\n`);
    }
    out[`${engine}Metrics`] = perMetric;
  }
  for (const engine of ["chromium", "webkit"] as const) {
    const report = load(dir, `profiling-${engine}.json`);
    if (report === null) continue;
    const scenarios = [...new Set(report.runs.map((r) => r.scenarioId))].sort();
    const commits = METRICS[0] === undefined ? [] : cells(report, { ...METRICS[0], key: "commits", pick: (r) => r.reactCommits }, scenarios);
    out[`${engine}ProfilingCommits`] = commits;
    md.push(`\n#### Profiling pass, ${report.browser}: React commits (Profiler onRender), median of ${commits[0]?.h.n ?? 0}\n`);
    md.push(`| Scenario | H | O | H / O |\n|---|---|---|---|`);
    for (const c of commits) md.push(`| \`${c.scenarioId}\` | ${fmt(c.h.median)} | ${fmt(c.o.median)} | ${c.o.median ? fmt((c.h.median ?? 0) / c.o.median, 1) : "n/m"}× |`);
  }
  for (const proto of ["hybrid", "own"]) {
    const file = join(dir, `soak-${proto}.json`);
    if (!existsSync(file)) continue;
    const s = JSON.parse(readFileSync(file, "utf8")) as SoakReport;
    const first = s.samples[0];
    const last = s.samples.at(-1);
    out[`soak-${proto}`] = { slopeMbPerMinute: s.slopeMbPerMinute, slopeMbPerRun: s.slopeMbPerRun, first, last, runs: s.runs.length, nonFinished: s.runs.filter((r) => r.status !== "finished").length };
  }
  writeFileSync(join(dir, "summary.json"), `${JSON.stringify(out, null, 1)}\n`);
  process.stdout.write(`${md.join("\n")}\n`);
}

main();
