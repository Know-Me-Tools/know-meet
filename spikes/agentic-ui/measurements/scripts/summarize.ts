/**
 * Aggregates measurements/raw/ into measurements/raw/summary.json and prints
 * Markdown tables for comparison.md:
 *   node scripts/summarize.ts
 * Inputs: browser-measure-<proto>-<browser>.json (harness measure reports) and
 * tauri-<runId>.jsonl (collector records, one line per POST /spike-report).
 * p95 is nearest-rank: with n = 5 it is the maximum.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const RAW = resolve(import.meta.dirname, "..", "raw");
const SPIKE = resolve(import.meta.dirname, "..", "..");
const PROTOS = ["hybrid", "own"] as const;
const BROWSERS = ["chromium", "webkit"] as const;
const INTERACTIVE = new Set(["a2ui-over-agui", "cancel-mid-stream", "hitl-approve", "hitl-expire", "hitl-reject"]);

type Num = number | null;
interface RunRow { readonly scenarioId: string; readonly error: string | null; readonly [k: string]: unknown }
interface MeasureFile { readonly environment: { readonly browser: string | null; readonly os: string; readonly node: string }; readonly scenarios: readonly { readonly id: string; readonly runs: readonly RunRow[]; readonly failures: number }[]; readonly bundle: { readonly totals: Sizes; readonly assets: readonly (Sizes & { readonly path: string })[]; readonly byExtension: Record<string, Sizes> } | null }
interface Sizes { readonly raw: number; readonly gzip: number; readonly brotli: number; readonly files?: number }
interface Stat { readonly n: number; readonly median: Num; readonly p95: Num }

function stat(values: readonly unknown[]): Stat {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return { n: 0, median: null, p95: null };
  const mid = Math.floor(nums.length / 2);
  const median = nums.length % 2 === 1 ? (nums[mid] ?? 0) : ((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2;
  const p95 = nums[Math.min(nums.length - 1, Math.ceil(0.95 * nums.length) - 1)] ?? null;
  return { n: nums.length, median: Math.round(median * 10) / 10, p95: p95 === null ? null : Math.round(p95 * 10) / 10 };
}

const fmt = (v: Num, div = 1, digits = 0): string => (v === null ? "n/m" : (v / div).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }));
const cell = (s: Stat, div = 1, digits = 0): string => (s.n === 0 ? "n/m" : `${fmt(s.median, div, digits)} / ${fmt(s.p95, div, digits)}`);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const BROWSER_METRICS: readonly { key: string; label: string; div?: number; digits?: number }[] = [
  { key: "timeToFirstTokenMs", label: "Time to first token (ms)" },
  { key: "totalStreamMs", label: "Total stream time (ms)" },
  { key: "reactCommits", label: "React commits" },
  { key: "storeCommits", label: "Store commits" },
  { key: "longTaskTotalMs", label: "Long-task total (ms, Chromium only)" },
  { key: "jsHeapUsedBytes", label: "JS heap used at settle, before GC (MB, Chromium only)", div: 1_048_576, digits: 1 },
  { key: "jsHeapUsedAfterGcBytes", label: "JS heap used after forced GC (MB, Chromium only)", div: 1_048_576, digits: 1 },
];

function browserTables(out: string[], summary: Record<string, unknown>): void {
  const files = new Map<string, MeasureFile>();
  for (const p of PROTOS) for (const b of BROWSERS) files.set(`${p}-${b}`, readJson<MeasureFile>(join(RAW, `browser-measure-${p}-${b}.json`)));
  const ids = files.get("hybrid-chromium")?.scenarios.map((s) => s.id) ?? [];
  const stats: Record<string, Record<string, Record<string, Stat>>> = {};
  for (const m of BROWSER_METRICS) {
    const cols = PROTOS.flatMap((p) => BROWSERS.map((b) => `${p}-${b}`)).filter((k) => !(m.key.startsWith("longTask") || m.key.startsWith("jsHeap")) || k.endsWith("chromium"));
    out.push(`### ${m.label}`, "", `| Scenario | ${cols.map((c) => `${c.replace("hybrid", "H").replace("own", "O")} med / p95`).join(" | ")} |`, `|---|${cols.map(() => "---").join("|")}|`);
    for (const id of ids) {
      const row = cols.map((c) => {
        const runs = files.get(c)?.scenarios.find((s) => s.id === id)?.runs.filter((r) => r.error === null) ?? [];
        const s = stat(runs.map((r) => r[m.key]));
        ((stats[m.key] ??= {})[id] ??= {})[c] = s;
        return cell(s, m.div ?? 1, m.digits ?? 0);
      });
      out.push(`| \`${id}\` | ${row.join(" | ")} |`);
    }
    out.push("");
  }
  const failures = [...files].map(([k, f]) => `${k}: ${f.scenarios.reduce((n, s) => n + s.failures, 0)} failed runs`);
  out.push(`Failed measurement runs: ${failures.join("; ")}.`, "");
  summary["browser"] = { stats, environment: Object.fromEntries([...files].map(([k, f]) => [k, f.environment])), failures };
}

function sizeOf(bytes: Buffer): Sizes {
  return { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length, brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length };
}

/** index.html plus every script/stylesheet/modulepreload it references (the initial load). */
function initialLoad(proto: string): { files: string[]; sizes: Sizes } {
  const dist = join(SPIKE, proto, "dist");
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="\.?\/?([^"]+\.(?:js|css))"/g)].map((m) => m[1] ?? "");
  const files = ["index.html", ...refs];
  const sizes = files.map((f) => sizeOf(readFileSync(join(dist, f))));
  return { files, sizes: sizes.reduce((a, s) => ({ raw: a.raw + s.raw, gzip: a.gzip + s.gzip, brotli: a.brotli + s.brotli }), { raw: 0, gzip: 0, brotli: 0 }) };
}

function bundleTable(out: string[], summary: Record<string, unknown>): void {
  const rows: Record<string, unknown> = {};
  out.push("| | Raw | gzip -9 | brotli -11 | Files |", "|---|---|---|---|---|");
  for (const p of PROTOS) {
    const b = readJson<MeasureFile>(join(RAW, `browser-measure-${p}-chromium.json`)).bundle;
    const init = initialLoad(p);
    if (b === null) continue;
    const js = b.byExtension[".js"];
    out.push(`| ${p === "hybrid" ? "H" : "O"} initial load (${init.files.join(", ")}) | ${fmt(init.sizes.raw)} | ${fmt(init.sizes.gzip)} | ${fmt(init.sizes.brotli)} | ${init.files.length} |`);
    if (js !== undefined) out.push(`| ${p === "hybrid" ? "H" : "O"} all JS | ${fmt(js.raw)} | ${fmt(js.gzip)} | ${fmt(js.brotli)} | ${js.files ?? "-"} |`);
    out.push(`| ${p === "hybrid" ? "H" : "O"} total dist (no source maps) | ${fmt(b.totals.raw)} | ${fmt(b.totals.gzip)} | ${fmt(b.totals.brotli)} | ${b.totals.files ?? "-"} |`);
    rows[p] = { initialLoad: init, totals: b.totals, byExtension: b.byExtension };
  }
  out.push("");
  summary["bundle"] = rows;
}

interface Record_ { readonly kind: string; readonly event?: string; readonly detail?: string; readonly step?: number | null; readonly scenarioId?: string; readonly mode?: string; readonly attempt?: number; readonly metrics?: Record<string, unknown> | null; readonly verdict?: { readonly problems: readonly string[] }; readonly csp?: readonly { directive: string; blockedUri: string; sourceFile: string; sample: string }[]; readonly axe?: readonly string[] | null; readonly client?: { readonly deviations: readonly string[] }; readonly userAgent?: string }

function tauriRuns(): Map<string, Record_[]> {
  const runs = new Map<string, Record_[]>();
  for (const f of readdirSync(RAW).filter((n) => n.startsWith("tauri-") && n.endsWith(".jsonl")).sort()) {
    runs.set(f.slice("tauri-".length, -".jsonl".length), readFileSync(join(RAW, f), "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record_));
  }
  return runs;
}

/** Last attempt per step. */
function finalResults(records: readonly Record_[]): Record_[] {
  const byStep = new Map<number, Record_>();
  for (const r of records) if (r.kind === "result" && typeof r.step === "number") byStep.set(r.step, r);
  return [...byStep.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}

function tauriSection(out: string[], summary: Record<string, unknown>): void {
  const tauri: Record<string, unknown> = {};
  for (const [runId, records] of tauriRuns()) {
    const results = finalResults(records);
    const pass = results.filter((r) => (r.verdict?.problems.length ?? 1) === 0);
    const csp = new Map<string, number>();
    for (const r of results) for (const v of r.csp ?? []) { const k = `${v.directive} | ${v.blockedUri || "(inline)"} | ${v.sample.slice(0, 60)}`; csp.set(k, (csp.get(k) ?? 0) + 1); }
    const axe = new Map<string, number>();
    for (const r of results) for (const a of r.axe ?? []) axe.set(a, (axe.get(a) ?? 0) + 1);
    const deviations = new Map<string, number>();
    for (const r of results) for (const d of r.client?.deviations ?? []) deviations.set(d, (deviations.get(d) ?? 0) + 1);
    const failures = results.filter((r) => !pass.includes(r)).map((r) => ({ step: r.step, scenarioId: r.scenarioId, problems: r.verdict?.problems ?? ["no verdict"] }));
    const events = records.filter((r) => r.kind === "event").map((r) => `${r.event ?? ""}${r.step === null || r.step === undefined ? "" : `@${r.step}`}: ${(r.detail ?? "").slice(0, 400)}`);
    const metrics: Record<string, Record<string, Stat>> = {};
    for (const key of ["timeToFirstTokenMs", "totalStreamMs", "domNodes", "longTaskTotalMs", "jsHeapUsedBytes"]) {
      for (const id of new Set(results.map((r) => r.scenarioId ?? ""))) {
        (metrics[key] ??= {})[id] = stat(results.filter((r) => r.scenarioId === id).map((r) => r.metrics?.[key]));
      }
    }
    for (const key of ["commits", "storeCommits"]) {
      for (const id of new Set(results.map((r) => r.scenarioId ?? ""))) {
        (metrics[key] ??= {})[id] = stat(results.filter((r) => r.scenarioId === id).map((r) => (r.metrics?.["counts"] as Record<string, unknown> | null | undefined)?.[key]));
      }
    }
    tauri[runId] = { steps: results.length, passed: pass.length, failures, csp: Object.fromEntries(csp), axe: Object.fromEntries(axe), deviations: Object.fromEntries(deviations), events, metrics, userAgent: results[0]?.userAgent ?? null };
    const measure = results[0]?.mode === "measure";
    if (measure) {
      // Measure mode performs no interactions and judges one snapshot at the first settle (no re-poll).
      const bySc = new Map<string, number>();
      for (const f of failures) bySc.set(f.scenarioId ?? "", (bySc.get(f.scenarioId ?? "") ?? 0) + 1);
      const unfocused = results.filter((r) => r.metrics?.["hasFocus"] === false).length;
      const hidden = results.filter((r) => r.metrics?.["visibility"] !== undefined && r.metrics["visibility"] !== "visible").length;
      out.push(`#### ${runId} (measure mode; settle-instant snapshot, no interactions)`, "", `- window state at settle: ${results.length - unfocused} / ${results.length} focused, ${results.length - hidden} / ${results.length} visible`);
      for (const [id, n] of bySc) {
        const first = failures.find((f) => f.scenarioId === id)?.problems[0] ?? "";
        out.push(`- \`${id}\`: ${n} / ${results.filter((r) => r.scenarioId === id).length} snapshots differ from the final expected state${INTERACTIVE.has(id) ? " (interactive scenario, expected)" : ""}: ${first.slice(0, 160)}`);
      }
    } else {
      out.push(`#### ${runId}: ${pass.length} / ${results.length} steps pass`, "");
      for (const f of failures) out.push(`- FAIL \`${f.scenarioId}\` (step ${f.step}): ${f.problems.join("; ").slice(0, 600)}`);
    }
    for (const [k, n] of csp) out.push(`- CSP ×${n}: ${k}`);
    for (const [k, n] of axe) out.push(`- axe ×${n}: ${k}`);
    for (const [k, n] of deviations) out.push(`- deviation ×${n}: ${k}`);
    out.push("");
  }
  summary["tauri"] = tauri;
  tauriMetricTables(out, tauri);
}

function tauriMetricTables(out: string[], tauri: Record<string, unknown>): void {
  const runFor = (p: string): Record<string, Record<string, Stat>> | undefined => {
    const key = Object.keys(tauri).find((k) => k.startsWith(`${p}-measure-`));
    return key === undefined ? undefined : (tauri[key] as { metrics: Record<string, Record<string, Stat>> }).metrics;
  };
  const h = runFor("hybrid");
  const o = runFor("own");
  if (h === undefined || o === undefined) return;
  const rows: readonly [string, string][] = [["timeToFirstTokenMs", "TTFT ms"], ["totalStreamMs", "Total ms"], ["commits", "React commits"], ["storeCommits", "Store commits"], ["domNodes", "DOM nodes at settle"]];
  out.push("### Tauri WKWebView metrics (median / p95, n = 5)", "", `| Scenario | ${rows.map(([, l]) => `${l} H | ${l} O`).join(" | ")} |`, `|---|${rows.map(() => "---|---").join("|")}|`);
  for (const id of Object.keys(h["totalStreamMs"] ?? {})) {
    out.push(`| \`${id}\` | ${rows.map(([k]) => `${cell(h[k]?.[id] ?? { n: 0, median: null, p95: null })} | ${cell(o[k]?.[id] ?? { n: 0, median: null, p95: null })}`).join(" | ")} |`);
  }
  out.push("", "Long-task total and JS heap: not measurable in WKWebView (no long-task entry type, no performance.memory); every run reported null.", "");
}

function main(): void {
  const out: string[] = [];
  const summary: Record<string, unknown> = { generatedAt: new Date().toISOString() };
  out.push("## Browser metrics", "");
  browserTables(out, summary);
  out.push("## Bundle", "");
  bundleTable(out, summary);
  out.push("## Tauri", "");
  tauriSection(out, summary);
  writeFileSync(join(RAW, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${out.join("\n")}\n`);
}

main();
