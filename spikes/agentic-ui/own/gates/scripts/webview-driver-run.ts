/**
 * Cross-platform variant of ../harness/src/webview-driver/tauri-run.ts for the WebView2 runbook
 * (gate 16.1). The harness runner is macOS-only: it hard-codes the app URL tauri://localhost and
 * calls osascript. On Windows, Tauri serves the app from http://tauri.localhost.
 *
 *   node gates/scripts/webview-driver-run.ts --binary <exe> --prototype <name> --app-url http://tauri.localhost/index.html
 *        [--repeats 6] [--scenarios a,b] [--timeout-min 60]
 *
 * Same driver script (harness buildDriverScript), same collector (POST /spike-report on :4317),
 * conformance mode, no axe. Prints "run <runId>: <n> steps" first, like tauri-run.ts.
 */
import { spawn } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOSTILE_MESSAGE_ID } from "../../../harness/src/corpus-authoring/hostile/hostile-corpus.ts";
import type { DriverStep, ReportProgress } from "../../../harness/src/domain/spike-report.ts";
import { REPORTS_DIR } from "../../../harness/src/shared/paths.ts";
import { buildDriverScript } from "../../../harness/src/webview-driver/build-driver.ts";
import { CONFORMANCE_SCENARIOS } from "./conformance-scenarios.ts";

const HARNESS = "http://127.0.0.1:4317";

interface Args {
  readonly binary: string;
  readonly prototype: string;
  readonly appUrl: string;
  readonly repeats: number;
  readonly scenarios: readonly string[];
  readonly timeoutMin: number;
}

function parseArgs(argv: readonly string[]): Args {
  const v = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) v.set(argv[i] ?? "", argv[i + 1] ?? "");
  const binary = v.get("--binary") ?? "";
  const prototype = v.get("--prototype") ?? "";
  if (binary === "" || !/^[a-z0-9-]+$/.test(prototype)) throw new Error("--binary <path> and --prototype <kebab-name> are required");
  const scenarios = v.get("--scenarios");
  return {
    binary,
    prototype,
    appUrl: v.get("--app-url") ?? "http://tauri.localhost/index.html",
    repeats: Number(v.get("--repeats") ?? "6"),
    scenarios: scenarios === undefined ? CONFORMANCE_SCENARIOS : scenarios.split(",").filter((s) => s !== ""),
    timeoutMin: Number(v.get("--timeout-min") ?? "60"),
  };
}

async function progress(runId: string): Promise<ReportProgress> {
  const res = await fetch(`${HARNESS}/spike-report/${runId}/progress`);
  if (!res.ok) throw new Error(`progress -> ${res.status}`);
  return (await res.json()) as ReportProgress;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const plan: DriverStep[] = args.scenarios.flatMap((scenarioId) => Array.from({ length: args.repeats }, (_, r) => ({ scenarioId, repeat: r + 1, mode: "conformance" as const })));
  const runId = `${args.prototype}-conformance-${Date.now().toString(36)}`;
  const dir = join(REPORTS_DIR, "webview-driver");
  mkdirSync(dir, { recursive: true });
  const scriptPath = join(dir, `${runId}.js`);
  writeFileSync(scriptPath, buildDriverScript({
    runId, prototype: args.prototype, harnessUrl: HARNESS, appUrl: args.appUrl, plan,
    hostileMessageId: HOSTILE_MESSAGE_ID, axe: false, verdictPollMs: 10_000, frameProbe: false,
  }));
  process.stdout.write(`run ${runId}: ${plan.length} steps\n`);
  const log = openSync(join(dir, `${runId}.app.log`), "w");
  const app = spawn(args.binary, [], { env: { ...process.env, KM_DRIVER_SCRIPT: scriptPath }, stdio: ["ignore", log, log] });
  let exited = false;
  app.on("exit", () => {
    exited = true;
  });
  const deadline = Date.now() + args.timeoutMin * 60_000;
  let result = "timeout";
  let last = -2;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_000));
    const p = await progress(runId);
    if (p.lastStep !== last) {
      last = p.lastStep;
      process.stdout.write(`  step ${p.lastStep + 1}/${plan.length}\n`);
    }
    if (p.done) {
      result = "done";
      break;
    }
    if (exited) {
      result = "app exited early";
      break;
    }
  }
  if (!exited) app.kill();
  process.stdout.write(`run ${runId}: ${result}; records in reports/spike-report/${runId}.jsonl\n`);
  if (result !== "done") process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
