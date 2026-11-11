/**
 * Gate 16.1 summary: reads gates/raw/16-1/{meta,tauri,window}-<runId>.* and writes
 * gates/raw/16-1/summary.json and steps-<runId>.jsonl (and prints Markdown tables).
 *
 *   node gates/scripts/summarize-window-states.ts [--dir 16-1|16-1-webview2] [--out summary.json] <runId> [<runId> ...]
 *
 * Per step it keeps the last collector attempt. A step is conformant when the collector's verdict
 * has no problems and the driver reported no error. A step is state-compliant when every stager
 * sample from 1 s before the step started until its last report matches the intended state.
 * p95 is nearest-rank. Pass per state: every scenario's p95 TTFT and p95 total stream time are
 * within 1.5x the focused p95 for that scenario, and every step is conformant.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { median, p95 } from "./stats.ts";

const RAW_ROOT = resolve(import.meta.dirname, "..", "raw");
let RAW = join(RAW_ROOT, "16-1");
const RATIO_LIMIT = 1.5;

interface Sample {
  readonly t: number;
  readonly frontmostIsTarget?: boolean;
  readonly targetOnScreen?: boolean;
  readonly targetHidden?: boolean;
  readonly coverage?: number;
  readonly method?: string;
  readonly event?: string;
}

interface PublishCounts {
  readonly flushes: number;
  readonly byTrigger: Readonly<Record<string, number>>;
  readonly maxLagMs: number;
}

interface ResultRecord {
  readonly kind: "result";
  readonly receivedAt: string;
  readonly step: number;
  readonly scenarioId: string;
  readonly repeat: number;
  readonly attempt: number;
  readonly startedAtEpochMs: number;
  readonly error: string | null;
  readonly verdict?: { readonly problems: readonly string[] };
  readonly metrics: {
    readonly timeToFirstTokenMs: number | null;
    readonly totalStreamMs: number | null;
    readonly hasFocus: boolean;
    readonly visibility: string;
    readonly counts: { readonly commits: number; readonly storeCommits: number; readonly publish?: PublishCounts; readonly runTiming?: { readonly startedAt: number | null; readonly settledAt: number | null } } | null;
  } | null;
}

interface Meta {
  readonly runId: string;
  readonly state: string;
}

export interface StepRow {
  readonly scenarioId: string;
  readonly repeat: number;
  readonly startedAtEpochMs: number;
  readonly conformant: boolean;
  readonly problems: readonly string[];
  readonly compliant: boolean;
  readonly samples: number;
  readonly ttftMs: number | null;
  readonly totalMs: number | null;
  readonly hasFocus: boolean | null;
  readonly visibility: string | null;
  readonly publish: PublishCounts | null;
}

function readJsonl<T>(file: string): T[] {
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as T);
}

function matches(state: string, s: Sample): boolean {
  if (s.event !== undefined) return false;
  switch (state) {
    case "focused":
      return s.frontmostIsTarget === true && s.targetOnScreen === true && (s.coverage ?? 1) === 0;
    case "unfocused":
      return s.frontmostIsTarget === false && s.targetOnScreen === true && s.targetHidden === false && (s.coverage ?? 1) === 0;
    case "occluded":
      return s.frontmostIsTarget === false && (s.coverage ?? 0) >= 0.999;
    case "minimised":
      return s.targetOnScreen === false && (s.method === "ax-minimised" || s.method === "win32-minimised");
    default:
      return false;
  }
}

function stepRows(meta: Meta): StepRow[] {
  const records = readJsonl<ResultRecord | { kind: "event" }>(join(RAW, `tauri-${meta.runId}.jsonl`)).filter((r): r is ResultRecord => r.kind === "result");
  const samples = readJsonl<Sample>(join(RAW, `window-${meta.runId}.jsonl`));
  const last = new Map<number, ResultRecord>();
  for (const r of records) if ((last.get(r.step)?.attempt ?? 0) < r.attempt) last.set(r.step, r);
  return [...last.values()].sort((a, b) => a.step - b.step).map((r) => {
    const end = Date.parse(r.receivedAt);
    const window = samples.filter((s) => s.t >= r.startedAtEpochMs - 1_000 && s.t <= end);
    const problems = [...(r.verdict?.problems ?? []), ...(r.error === null ? [] : [`driver error: ${r.error}`])];
    return {
      scenarioId: r.scenarioId,
      repeat: r.repeat,
      startedAtEpochMs: r.startedAtEpochMs,
      conformant: problems.length === 0,
      problems,
      compliant: window.length > 0 && window.every((s) => matches(meta.state, s)),
      samples: window.length,
      ttftMs: r.metrics?.timeToFirstTokenMs ?? null,
      totalMs: r.metrics?.totalStreamMs ?? null,
      hasFocus: r.metrics?.hasFocus ?? null,
      visibility: r.metrics?.visibility ?? null,
      publish: r.metrics?.counts?.publish ?? null,
    };
  });
}

interface ScenarioStats {
  readonly n: number;
  readonly ttft: { readonly median: number | null; readonly p95: number | null };
  readonly total: { readonly median: number | null; readonly p95: number | null };
}

function stats(rows: readonly StepRow[]): ScenarioStats {
  const nums = (pick: (r: StepRow) => number | null): number[] => rows.map(pick).filter((v): v is number => v !== null);
  return {
    n: rows.length,
    ttft: { median: median(nums((r) => r.ttftMs)), p95: p95(nums((r) => r.ttftMs)) },
    total: { median: median(nums((r) => r.totalMs)), p95: p95(nums((r) => r.totalMs)) },
  };
}

function ratio(a: number | null, b: number | null): number | null {
  return a === null || b === null || b === 0 ? null : Math.round((a / b) * 100) / 100;
}

function main(): void {
  const argv = process.argv.slice(2);
  const dirIdx = argv.indexOf("--dir");
  if (dirIdx >= 0) {
    const dir = argv.splice(dirIdx, 2)[1] ?? "";
    if (!/^[a-z0-9-]+$/.test(dir)) throw new Error("--dir must be a kebab-case directory under gates/raw");
    RAW = join(RAW_ROOT, dir);
  }
  const outIdx = argv.indexOf("--out");
  const outName = outIdx >= 0 ? (argv.splice(outIdx, 2)[1] ?? "summary.json") : "summary.json";
  if (!/^[a-z0-9-]+\.json$/.test(outName)) throw new Error("--out must be a kebab-case .json file name");
  const metas = argv.map((id) => JSON.parse(readFileSync(join(RAW, `meta-${id}.json`), "utf8")) as Meta);
  // Several runs of one state (e.g. a repeated focused baseline) are pooled.
  const byState = new Map<string, { runIds: string[]; rows: StepRow[] }>();
  for (const m of metas) {
    const rows = stepRows(m);
    writeFileSync(join(RAW, `steps-${m.runId}.jsonl`), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const entry = byState.get(m.state) ?? { runIds: [], rows: [] };
    entry.runIds.push(m.runId);
    entry.rows.push(...rows);
    byState.set(m.state, entry);
  }
  const focused = byState.get("focused");
  if (focused === undefined) throw new Error("a focused run is required as the baseline");
  const scenarios = [...new Set(focused.rows.map((r) => r.scenarioId))];
  const baseline = new Map(scenarios.map((s) => [s, stats(focused.rows.filter((r) => r.scenarioId === s && r.compliant))]));
  const out: Record<string, unknown> = {};
  for (const [state, { runIds, rows }] of byState) {
    const used = rows.filter((r) => r.compliant);
    const perScenario = scenarios.map((s) => {
      const st = stats(used.filter((r) => r.scenarioId === s));
      const base = baseline.get(s);
      const ttftRatio = ratio(st.ttft.p95, base?.ttft.p95 ?? null);
      const totalRatio = ratio(st.total.p95, base?.total.p95 ?? null);
      const withinBound = (ttftRatio === null || ttftRatio <= RATIO_LIMIT) && (totalRatio === null || totalRatio <= RATIO_LIMIT) && st.n >= 5;
      return { scenarioId: s, ...st, ttftP95Ratio: ttftRatio, totalP95Ratio: totalRatio, withinBound };
    });
    const triggers: Record<string, number> = {};
    for (const r of used) for (const [k, v] of Object.entries(r.publish?.byTrigger ?? {})) triggers[k] = (triggers[k] ?? 0) + v;
    out[state] = {
      runIds,
      steps: rows.length,
      compliantSteps: used.length,
      conformantSteps: rows.filter((r) => r.conformant).length,
      nonConformant: rows.filter((r) => !r.conformant).map((r) => ({ scenarioId: r.scenarioId, repeat: r.repeat, problems: r.problems })),
      visibility: Object.fromEntries([...new Set(used.map((r) => r.visibility))].map((v) => [String(v), used.filter((r) => r.visibility === v).length])),
      hasFocusTrue: used.filter((r) => r.hasFocus === true).length,
      publishTriggers: triggers,
      maxPublishLagMs: Math.max(0, ...used.map((r) => r.publish?.maxLagMs ?? 0)),
      // long-markdown re-renders ~20 KB of markdown per publish; its main-thread work, not the scheduler, sets its lag.
      maxPublishLagMsExcludingLongMarkdown: Math.max(0, ...used.filter((r) => r.scenarioId !== "long-markdown").map((r) => r.publish?.maxLagMs ?? 0)),
      pooled: stats(used),
      perScenario,
      pass: rows.every((r) => r.conformant) && perScenario.every((p) => p.withinBound),
    };
  }
  // One compact line per state keeps the file short and diffable.
  const body = Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n");
  writeFileSync(join(RAW, outName), `{\n${body}\n}\n`);
  for (const [state, value] of Object.entries(out)) {
    const v = value as { compliantSteps: number; steps: number; conformantSteps: number; pass: boolean; perScenario: { scenarioId: string; n: number; ttft: { median: number | null; p95: number | null }; total: { median: number | null; p95: number | null }; ttftP95Ratio: number | null; totalP95Ratio: number | null }[] };
    process.stdout.write(`\n### ${state}: ${v.compliantSteps}/${v.steps} compliant, ${v.conformantSteps}/${v.steps} conformant, pass=${String(v.pass)}\n\n`);
    process.stdout.write("| Scenario | n | TTFT median / p95 (ms) | x focused p95 | Total median / p95 (ms) | x focused p95 |\n|---|---|---|---|---|---|\n");
    for (const p of v.perScenario) {
      process.stdout.write(`| \`${p.scenarioId}\` | ${p.n} | ${p.ttft.median ?? "n/a"} / ${p.ttft.p95 ?? "n/a"} | ${p.ttftP95Ratio ?? "n/a"} | ${p.total.median ?? "n/a"} / ${p.total.p95 ?? "n/a"} | ${p.totalP95Ratio ?? "n/a"} |\n`);
    }
  }
}

main();
