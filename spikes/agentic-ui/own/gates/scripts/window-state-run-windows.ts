/**
 * Windows (WebView2) counterpart of window-state-run.ts for gate 16.1 — see ../../webview2-runbook.md.
 *
 *   node gates/scripts/window-state-run-windows.ts --state focused|unfocused|occluded|minimised [--repeats 6]
 *
 * Starts gates/scripts/webview-driver-run.ts (app URL http://tauri.localhost/index.html) with the gate
 * shell, starts gates/scripts/window-stage.ps1 one second later, and copies the collector JSONL, the
 * stager log and a meta record into gates/raw/16-1-webview2/. Tauri's background_throttling is
 * unsupported on Windows, so KM_BACKGROUND_THROTTLING has no effect there; it is set for parity.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const STATES = ["focused", "unfocused", "occluded", "minimised"] as const;
type WindowState = (typeof STATES)[number];
const OWN = resolve(import.meta.dirname, "..", "..");
const HARNESS_REPORTS = resolve(OWN, "..", "harness", "reports", "spike-report");
const RAW = join(OWN, "gates", "raw", "16-1-webview2");
const BINARY = join(OWN, "gates", "bin", "km-spike-own-gate.exe");

function isState(v: string): v is WindowState {
  return (STATES as readonly string[]).includes(v);
}

function waitExit(child: ChildProcess): Promise<number | null> {
  return new Promise((done) => child.on("exit", (code) => done(code)));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const state = argv[argv.indexOf("--state") + 1] ?? "";
  if (!isState(state)) throw new Error(`--state ${STATES.join("|")}`);
  const repeats = argv.includes("--repeats") ? (argv[argv.indexOf("--repeats") + 1] ?? "6") : "6";
  if (!existsSync(BINARY)) throw new Error(`${BINARY} missing: node gates/scripts/build-gate-shell.ts`);
  mkdirSync(RAW, { recursive: true });
  const driverArgs = ["gates/scripts/webview-driver-run.ts", "--binary", BINARY, "--prototype", `own-gate-wv2-${state}`, "--repeats", repeats];
  const startedAt = new Date().toISOString();
  const driver = spawn("node", driverArgs, { cwd: OWN, env: { ...process.env, KM_BACKGROUND_THROTTLING: "default" }, stdio: ["ignore", "pipe", "inherit"] });
  let runId: string | null = null;
  driver.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    runId ??= /run ([a-z0-9-]+): \d+ steps/.exec(chunk.toString())?.[1] ?? null;
  });
  const driverExit = waitExit(driver);
  await new Promise((r) => setTimeout(r, 1_000));
  if (runId === null) throw new Error("driver did not report its run id");
  const id: string = runId;
  const stagerArgs = ["-NoProfile", "-File", join(OWN, "gates", "scripts", "window-stage.ps1"), "-Mode", state, "-Owner", "km-spike-own-gate"];
  const stager = spawn("pwsh", stagerArgs, { stdio: ["ignore", "pipe", "inherit"] });
  stager.stdout?.pipe(createWriteStream(join(RAW, `window-${id}.jsonl`)));
  const code = await driverExit;
  stager.kill();
  const collector = join(HARNESS_REPORTS, `${id}.jsonl`);
  if (existsSync(collector)) copyFileSync(collector, join(RAW, `tauri-${id}.jsonl`));
  writeFileSync(join(RAW, `meta-${id}.json`), `${JSON.stringify({
    runId: id, state, repeats: Number(repeats), binary: BINARY, platform: process.platform, startedAt, endedAt: new Date().toISOString(),
    driverExit: code, driverCommand: ["node", ...driverArgs].join(" "), stagerCommand: ["pwsh", ...stagerArgs].join(" "),
  }, null, 2)}\n`);
  process.stdout.write(`state ${state}: run ${id}, driver exit ${String(code)}\n`);
  if (code !== 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
