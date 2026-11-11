/**
 * Gate 16.3 follow-up summariser. Same statistics as harness/src/measure/paired-report.ts (its metric
 * definitions copied verbatim, since importing that module runs its main; the same per-cell seed and `pairedDifference`: median of O − H within a repetition, 95% percentile
 * bootstrap, 10,000 resamples), plus the worst animation frame, applied to:
 *   - "before": the 16.3 measured runs (measurements/raw/16-3/noprof-<engine>.json, incl. its re-runs);
 *   - "after":  this follow-up (gates/raw/16-3-followup/paired/followup-<engine>.json).
 *
 *   node gates/scripts/summarize-16-3-followup.ts > gates/raw/16-3-followup/summary.md
 * Writes gates/raw/16-3-followup/summary.json.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pairedDifference, quantile } from "../../../harness/src/measure/paired-stats.ts";
import type { RenderRunResult } from "../../../harness/src/measure/render-run.ts";

const SPIKE = resolve(import.meta.dirname, "../../..");
const SCENARIOS = ["long-markdown", "cancel-mid-stream", "hostile/huge-table"];
const ENGINES = ["chromium", "webkit"] as const;

const ms = (v: number | null | undefined): number | null => (v === undefined ? null : v);
const p50 = (xs: readonly number[]): number | null => quantile(xs, 0.5);
const max = (xs: readonly number[]): number | null => (xs.length === 0 ? null : Math.max(...xs));
type Engine = "chromium" | "webkit";
const metrics: { key: string; title: string; unit: string; engines: readonly Engine[]; pick: (r: RenderRunResult) => number | null }[] = [
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
  { key: "maxFrame", title: "Worst animation frame (rAF delta)", unit: "ms", engines: ["chromium", "webkit"], pick: (r) => r.frameStats?.maxFrameMs ?? null },
];

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function runs(file: string, rerun?: string): RenderRunResult[] {
  const base = (JSON.parse(readFileSync(file, "utf8")) as { runs: RenderRunResult[] }).runs;
  if (rerun === undefined || !existsSync(rerun)) return base;
  const re = (JSON.parse(readFileSync(rerun, "utf8")) as { runs: RenderRunResult[] }).runs;
  const key = (r: RenderRunResult): string => `${r.scenarioId}|${r.repeat}`;
  const replaced = new Set(re.map(key));
  return [...base.filter((r) => !replaced.has(key(r))), ...re];
}

const sets = {
  before: (e: string) => runs(`${SPIKE}/measurements/raw/16-3/noprof-${e}.json`, e === "chromium" ? `${SPIKE}/measurements/raw/16-3/noprof-rerun-chromium.json` : undefined),
  after: (e: string) => runs(`${SPIKE}/own/gates/raw/16-3-followup/paired/followup-${e}.json`),
};

const r0 = (v: number | null): string => (v === null ? "n/a" : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ""));
const out: Record<string, unknown> = {};
const lines: string[] = [];
for (const engine of ENGINES) {
  for (const metric of metrics) {
    if (!metric.engines.includes(engine)) continue;
    lines.push(`\n#### ${engine}: ${metric.title} (${metric.unit})\n`, "| Scenario | Set | H median | O median | O − H median [95% CI] | O>H / O<H | n | |", "|---|---|---|---|---|---|---|---|");
    for (const scenarioId of SCENARIOS) {
      for (const [set, load] of Object.entries(sets)) {
        const all = load(engine).filter((r) => r.scenarioId === scenarioId && r.error === null);
        const byRep = new Map<number, { h?: number; o?: number }>();
        for (const r of all) {
          const v = metric.pick(r);
          if (v === null) continue;
          const slot = byRep.get(r.repeat) ?? {};
          if (r.prototype === "hybrid") slot.h = v;
          else slot.o = v;
          byRep.set(r.repeat, slot);
        }
        const pairs = [...byRep.values()].filter((p): p is { h: number; o: number } => p.h !== undefined && p.o !== undefined);
        const d = pairedDifference(pairs.map((p) => p.o - p.h), seedOf(`${engine}|${metric.key}|${scenarioId}`));
        const hMed = quantile(pairs.map((p) => p.h), 0.5);
        const oMed = quantile(pairs.map((p) => p.o), 0.5);
        out[`${engine}|${metric.key}|${scenarioId}|${set}`] = { hMedian: hMed, oMedian: oMed, oValues: pairs.map((p) => p.o), hValues: pairs.map((p) => p.h), ...d };
        lines.push(`| \`${scenarioId}\` | ${set} | ${r0(hMed)} | ${r0(oMed)} | ${r0(d.medianDiff)} [${r0(d.ciLow)}, ${r0(d.ciHigh)}] | ${d.positive} / ${d.negative} | ${d.n} | ${d.meaningful ? "**M**" : ""} |`);
      }
    }
  }
}
writeFileSync(resolve(import.meta.dirname, "../raw/16-3-followup/summary.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(lines.join("\n"));
