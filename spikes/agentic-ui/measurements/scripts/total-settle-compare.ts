/**
 * Gate 16.1 follow-up (2026-11-11): compares the event-driven "total" (submit -> render-complete of
 * the first settle, harness instrumentation.ts renderSettle) with the LEGACY 20 ms settle poll and
 * with O's own runTiming, per scenario, as p95 ratios to a focused baseline.
 *
 *   node measurements/scripts/total-settle-compare.ts --focused <runId> --other <runId> [--dir <raw dir>] > out.json
 *
 * Uses only state-compliant steps from steps-<runId>.jsonl (written by own/gates/scripts/summarize-window-states.ts)
 * and the last collector attempt per step from tauri-<runId>.jsonl. p95 is nearest-rank.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface Metrics {
  readonly timeToFirstTokenMs: number | null;
  readonly totalStreamMs: number | null;
  readonly legacyPollTotalStreamMs?: number | null;
  readonly totalStreamSource?: string;
  readonly counts: { readonly runTiming?: { readonly startedAt: number | null; readonly settledAt: number | null } } | null;
}

interface ResultRecord {
  readonly kind: string;
  readonly scenarioId: string;
  readonly repeat: number;
  readonly step: number;
  readonly attempt: number;
  readonly metrics: Metrics | null;
}

interface StepRow {
  readonly scenarioId: string;
  readonly repeat: number;
  readonly compliant: boolean;
}

interface Row {
  readonly scenarioId: string;
  readonly ttft: number | null;
  readonly total: number | null;
  readonly legacy: number | null;
  readonly runTiming: number | null;
  readonly source: string | null;
}

function readJsonl<T>(file: string): T[] {
  return readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as T);
}

function p95(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)] ?? 0);
}

function rows(dir: string, runId: string): Row[] {
  const compliant = new Set(readJsonl<StepRow>(join(dir, `steps-${runId}.jsonl`)).filter((s) => s.compliant).map((s) => `${s.scenarioId}#${s.repeat}`));
  const last = new Map<number, ResultRecord>();
  for (const r of readJsonl<ResultRecord>(join(dir, `tauri-${runId}.jsonl`))) {
    if (r.kind === "result" && (last.get(r.step)?.attempt ?? 0) < r.attempt) last.set(r.step, r);
  }
  return [...last.values()].filter((r) => compliant.has(`${r.scenarioId}#${r.repeat}`)).map((r) => {
    const t = r.metrics?.counts?.runTiming;
    return {
      scenarioId: r.scenarioId,
      ttft: r.metrics?.timeToFirstTokenMs ?? null,
      total: r.metrics?.totalStreamMs ?? null,
      legacy: r.metrics?.legacyPollTotalStreamMs ?? null,
      runTiming: t?.startedAt != null && t.settledAt != null ? t.settledAt - t.startedAt : null,
      source: r.metrics?.totalStreamSource ?? null,
    };
  });
}

type Key = "ttft" | "total" | "legacy" | "runTiming";
const KEYS: readonly Key[] = ["ttft", "total", "legacy", "runTiming"];

function p95Of(rs: readonly Row[], key: Key): number | null {
  return p95(rs.map((r) => r[key]).filter((v): v is number => v !== null));
}

function main(): void {
  const argv = process.argv.slice(2);
  const arg = (name: string): string | undefined => argv[argv.indexOf(name) + 1];
  const focusedId = arg("--focused");
  const otherId = arg("--other");
  if (focusedId === undefined || otherId === undefined) throw new Error("--focused <runId> --other <runId>");
  const dir = resolve(arg("--dir") ?? join(import.meta.dirname, "..", "..", "own", "gates", "raw", "16-1"));
  const focused = rows(dir, focusedId);
  const other = rows(dir, otherId);
  const scenarios = [...new Set(focused.map((r) => r.scenarioId))];
  const perScenario = scenarios.map((s) => {
    const f = focused.filter((r) => r.scenarioId === s);
    const o = other.filter((r) => r.scenarioId === s);
    const entry: Record<string, unknown> = { scenarioId: s, nFocused: f.length, nOther: o.length };
    for (const k of KEYS) {
      const fp = p95Of(f, k);
      const op = p95Of(o, k);
      entry[k] = { focusedP95: fp, otherP95: op, ratio: fp === null || op === null || fp === 0 ? null : Math.round((op / fp) * 100) / 100 };
    }
    return entry;
  });
  const sources = (rs: readonly Row[]): Record<string, number> => Object.fromEntries([...new Set(rs.map((r) => String(r.source)))].map((s) => [s, rs.filter((r) => String(r.source) === s).length]));
  process.stdout.write(`${JSON.stringify({ focusedRunId: focusedId, otherRunId: otherId, totalSources: { focused: sources(focused), other: sources(other) }, perScenario }, null, 1)}\n`);
}

main();
