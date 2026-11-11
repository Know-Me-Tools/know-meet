/**
 * Gate 16.1 minimised soak: buckets the steps of a long minimised run by time since the window was
 * first observed minimised, and judges every step against the focused p95 for its scenario.
 *
 *   node gates/scripts/soak-minimised.ts --soak <runId> --focused <runId>[,<runId>] [--after-min 5]
 *
 * Reads gates/raw/16-1/steps-<id>.jsonl (written by summarize-window-states.ts, run it first) and
 * window-<id>.jsonl. Writes gates/raw/16-1/soak-<soakId>.json and prints a short Markdown summary.
 * A step after the threshold passes when it is conformant, state-compliant, and its TTFT and total
 * are each within 1.5x the focused p95 for its scenario.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { p95 } from "./stats.ts";
import type { StepRow } from "./summarize-window-states.ts";

const RAW = resolve(import.meta.dirname, "..", "raw", "16-1");
const RATIO_LIMIT = 1.5;

interface Sample { readonly t: number; readonly targetOnScreen?: boolean; readonly method?: string; readonly event?: string }

function readJsonl<T>(file: string): T[] {
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as T);
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? process.argv[i + 1] : fallback;
  if (v === undefined || !/^[a-z0-9.,-]+$/.test(v)) throw new Error(`${name} missing or invalid`);
  return v;
}

function main(): void {
  const soakId = arg("--soak");
  const focusedIds = arg("--focused").split(",");
  const afterMin = Number(arg("--after-min", "5"));
  const focused = focusedIds.flatMap((id) => readJsonl<StepRow>(join(RAW, `steps-${id}.jsonl`))).filter((r) => r.compliant);
  const base = new Map<string, { ttft: number | null; total: number | null }>();
  for (const s of new Set(focused.map((r) => r.scenarioId))) {
    const rows = focused.filter((r) => r.scenarioId === s);
    base.set(s, { ttft: p95(rows.flatMap((r) => (r.ttftMs === null ? [] : [r.ttftMs]))), total: p95(rows.flatMap((r) => (r.totalMs === null ? [] : [r.totalMs]))) });
  }
  const samples = readJsonl<Sample>(join(RAW, `window-${soakId}.jsonl`));
  const t0 = samples.find((s) => s.event === undefined && s.targetOnScreen === false && s.method === "ax-minimised")?.t;
  if (t0 === undefined) throw new Error("no minimised sample in the stager log");
  const lastSample = samples.at(-1)?.t ?? t0;
  const rows = readJsonl<StepRow>(join(RAW, `steps-${soakId}.jsonl`)).map((r) => {
    const b = base.get(r.scenarioId);
    const ttftRatio = r.ttftMs !== null && b?.ttft ? Math.round((r.ttftMs / b.ttft) * 100) / 100 : null;
    const totalRatio = r.totalMs !== null && b?.total ? Math.round((r.totalMs / b.total) * 100) / 100 : null;
    const minutes = Math.round(((r.startedAtEpochMs - t0) / 60_000) * 100) / 100;
    const ok = r.conformant && r.compliant && ttftRatio !== null && ttftRatio <= RATIO_LIMIT && totalRatio !== null && totalRatio <= RATIO_LIMIT;
    return { scenarioId: r.scenarioId, repeat: r.repeat, minutesSinceMinimised: minutes, conformant: r.conformant, problems: r.problems, compliant: r.compliant, visibility: r.visibility, ttftMs: r.ttftMs, totalMs: r.totalMs, ttftRatio, totalRatio, ok };
  });
  const bucket = (pred: (m: number) => boolean) => {
    const rs = rows.filter((r) => pred(r.minutesSinceMinimised));
    const max = (k: "ttftRatio" | "totalRatio") => Math.max(0, ...rs.map((r) => r[k] ?? Infinity));
    return { steps: rs.length, compliant: rs.filter((r) => r.compliant).length, conformant: rs.filter((r) => r.conformant).length, withinBound: rs.filter((r) => r.ok).length, maxTtftRatio: max("ttftRatio"), maxTotalRatio: max("totalRatio"), scenarios: [...new Set(rs.map((r) => r.scenarioId))] };
  };
  const out = {
    soakRunId: soakId, focusedRunIds: focusedIds, minimisedAtEpochMs: t0, minimisedForMin: Math.round(((lastSample - t0) / 60_000) * 100) / 100, afterMin,
    before: bucket((m) => m < afterMin), after: bucket((m) => m >= afterMin),
    failing: rows.filter((r) => !r.ok), steps: rows,
  };
  writeFileSync(join(RAW, `soak-${soakId}.json`), `${JSON.stringify(out, null, 1)}\n`);
  process.stdout.write(`soak ${soakId}: minimised ${out.minimisedForMin} min\n`);
  for (const k of ["before", "after"] as const) process.stdout.write(`${k} ${afterMin} min: ${JSON.stringify(out[k])}\n`);
  process.stdout.write(`failing steps: ${JSON.stringify(out.failing.map((r) => [r.scenarioId, r.repeat, r.minutesSinceMinimised, r.ttftRatio, r.totalRatio, r.problems]))}\n`);
}

main();
