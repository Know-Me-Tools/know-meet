/**
 * Gate 16.1: O's own run duration per step, independent of the harness driver's settle polling
 * (a 20 ms setTimeout loop, which hidden-page timer throttling clamps). Uses the probe's
 * renderCounts().runTiming (Date.now at run start and at settle, recorded by AgentSession) from the
 * last collector attempt of each step. For steps with interactions (HITL decisions, A2UI actions)
 * the probe holds the last run of the step, so compare scenarios across states, not with the
 * driver's first-settle totals.
 *
 *   node gates/scripts/o-internal-timing.ts <label>=<runId>[,<runId>] ... > gates/raw/16-1/o-internal-timing.json
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { median, p95 } from "./stats.ts";

const RAW = resolve(import.meta.dirname, "..", "raw", "16-1");

interface Rec {
  readonly kind: string;
  readonly step: number;
  readonly attempt: number;
  readonly scenarioId: string;
  readonly metrics: { readonly counts: { readonly runTiming?: { readonly startedAt: number | null; readonly settledAt: number | null } } | null } | null;
}

function durations(runId: string): Map<string, number[]> {
  const last = new Map<number, Rec>();
  for (const line of readFileSync(join(RAW, `tauri-${runId}.jsonl`), "utf8").split("\n")) {
    if (line.trim() === "") continue;
    const r = JSON.parse(line) as Rec;
    if (r.kind === "result" && (last.get(r.step)?.attempt ?? 0) < r.attempt) last.set(r.step, r);
  }
  const out = new Map<string, number[]>();
  for (const r of last.values()) {
    const t = r.metrics?.counts?.runTiming;
    if (t?.startedAt == null || t.settledAt == null) continue;
    out.set(r.scenarioId, [...(out.get(r.scenarioId) ?? []), t.settledAt - t.startedAt]);
  }
  return out;
}

const result: Record<string, Record<string, { n: number; median: number | null; p95: number | null }>> = {};
for (const arg of process.argv.slice(2)) {
  const [label, ids] = arg.split("=");
  if (label === undefined || ids === undefined) throw new Error(`expected <label>=<runId>[,<runId>], got ${arg}`);
  const merged = new Map<string, number[]>();
  for (const id of ids.split(",")) for (const [s, v] of durations(id)) merged.set(s, [...(merged.get(s) ?? []), ...v]);
  result[label] = Object.fromEntries([...merged].map(([s, v]) => [s, { n: v.length, median: median(v), p95: p95(v) }]));
}
const body = Object.entries(result).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n");
process.stdout.write(`{\n${body}\n}\n`);
