/**
 * Runs one prototype inside the Tauri shell (spikes/agentic-ui/tauri-shell) with
 * the in-webview driver, waits for the plan to finish and stops the app.
 *
 *   node src/webview-driver/tauri-run.ts --binary <path> --prototype <hybrid|own> --mode <conformance|measure>
 *        [--repeats 5] [--scenarios a,b] [--timeout-min 90] [--no-axe] [--frame-probe]
 *
 * The shell reads the driver from KM_DRIVER_SCRIPT and installs it as the
 * window's initialization script. Results land in reports/spike-report/<runId>.jsonl
 * (written by the harness collector, which must be running: pnpm serve).
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOSTILE_MESSAGE_ID } from "../corpus-authoring/hostile/hostile-corpus.ts";
import type { DriverMode, DriverStep, ReportProgress } from "../domain/spike-report.ts";
import { REPORTS_DIR } from "../shared/paths.ts";
import { buildDriverScript } from "./build-driver.ts";

const HARNESS = "http://127.0.0.1:4317";
const MEASURE_SCENARIOS = [
  "a2ui-over-agui", "cancel-mid-stream", "custom-chunks", "disconnect-reconnect-replay", "hitl-approve", "hitl-expire", "hitl-reject",
  "long-markdown", "malformed-out-of-order", "parallel-tool-calls", "reasoning-subagents-snapshot", "run-cancelled-by-agent", "run-error",
  "state-snapshot-delta", "hostile/huge-table",
];

interface Args {
  readonly binary: string;
  readonly prototype: string;
  readonly mode: DriverMode;
  readonly repeats: number;
  readonly scenarios: readonly string[] | null;
  readonly timeoutMin: number;
  readonly axe: boolean;
  readonly frameProbe: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const v = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? "";
    if (a === "--no-axe" || a === "--frame-probe") flags.add(a);
    else v.set(a, argv[++i] ?? "");
  }
  const mode = v.get("--mode");
  if (mode !== "conformance" && mode !== "measure") throw new Error("--mode conformance|measure");
  const binary = v.get("--binary") ?? "";
  const prototype = v.get("--prototype") ?? "";
  if (binary === "" || !/^[a-z0-9-]+$/.test(prototype)) throw new Error("--binary <path> and --prototype <name> are required");
  const scenarios = v.get("--scenarios");
  return {
    binary,
    prototype,
    mode,
    repeats: Number(v.get("--repeats") ?? (mode === "measure" ? "5" : "1")),
    scenarios: scenarios === undefined ? null : scenarios.split(",").filter((s) => s !== ""),
    timeoutMin: Number(v.get("--timeout-min") ?? "90"),
    axe: mode === "conformance" && !flags.has("--no-axe"),
    frameProbe: flags.has("--frame-probe"),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

async function plan(args: Args): Promise<DriverStep[]> {
  let ids = args.scenarios;
  if (ids === null && args.mode === "measure") ids = MEASURE_SCENARIOS;
  if (ids === null) {
    const { scenarios } = await getJson<{ scenarios: { id: string; family: string }[] }>(`${HARNESS}/scenarios`);
    ids = scenarios.filter((s) => s.family === "ag-ui" || s.family === "hostile").map((s) => s.id);
  }
  return ids.flatMap((scenarioId) => Array.from({ length: args.repeats }, (_, r) => ({ scenarioId, repeat: r + 1, mode: args.mode })));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const steps = await plan(args);
  const runId = `${args.prototype}-${args.mode}${args.frameProbe ? "-fps" : ""}-${Date.now().toString(36)}`;
  const dir = join(REPORTS_DIR, "webview-driver");
  mkdirSync(dir, { recursive: true });
  const scriptPath = join(dir, `${runId}.js`);
  writeFileSync(scriptPath, buildDriverScript({
    runId, prototype: args.prototype, harnessUrl: HARNESS, appUrl: "tauri://localhost/index.html", plan: steps,
    hostileMessageId: HOSTILE_MESSAGE_ID, axe: args.axe, verdictPollMs: 10_000, frameProbe: args.frameProbe,
  }));
  const log = openSync(join(dir, `${runId}.app.log`), "w");
  process.stdout.write(`run ${runId}: ${steps.length} steps, app log ${join(dir, `${runId}.app.log`)}\n`);
  const app = spawn(args.binary, [], { env: { ...process.env, KM_DRIVER_SCRIPT: scriptPath }, stdio: ["ignore", log, log] });
  // Bring the window to the front: WKWebView defers requestAnimationFrame for non-key windows. Best effort.
  setTimeout(() => {
    const script = `tell application "System Events" to set frontmost of (every process whose unix id is ${app.pid ?? 0}) to true`;
    const r = spawnSync("osascript", ["-e", script], { encoding: "utf8" });
    process.stdout.write(`  frontmost request: exit ${r.status ?? "signal"} ${r.stderr.trim()}\n`);
  }, 1_500);
  let exited = false;
  app.on("exit", () => { exited = true; });
  const deadline = Date.now() + args.timeoutMin * 60_000;
  let last = -2;
  let result = "timeout";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    const p = await getJson<ReportProgress>(`${HARNESS}/spike-report/${runId}/progress`);
    if (p.lastStep !== last) {
      last = p.lastStep;
      process.stdout.write(`  step ${p.lastStep + 1}/${steps.length}\n`);
    }
    if (p.done) { result = "done"; break; }
    if (exited) { result = "app exited early"; break; }
  }
  if (!exited) app.kill("SIGTERM");
  process.stdout.write(`run ${runId}: ${result}; records in reports/spike-report/${runId}.jsonl\n`);
  if (result !== "done") process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
