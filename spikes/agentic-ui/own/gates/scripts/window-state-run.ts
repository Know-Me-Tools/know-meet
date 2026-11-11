/**
 * Gate 16.1: runs the 14 AG-UI conformance scenarios in the Tauri WKWebView shell under one
 * controlled window state, with background throttling at Tauri's default (policy unset).
 *
 *   node gates/scripts/window-state-run.ts --state focused|unfocused|occluded|minimised [--repeats 6]
 *        [--binary gates/bin/km-spike-own-gate] [--label own-gate] [--throttling default|disabled|config]
 *        [--stager-style titled|borderless]
 *
 * 1. Starts the harness driver run (../harness/src/webview-driver/tauri-run.ts, unchanged) with
 *    KM_BACKGROUND_THROTTLING=default (or as --throttling says), conformance mode, no axe. tauri-run brings the app to the
 *    front at about 1.5 s.
 * 2. At 1 s starts gates/bin/window-stage in the requested mode; it re-asserts the state every
 *    second and logs one JSON sample per second.
 * 3. When the driver run ends, stops the stager and copies the collector's JSONL, the stager log
 *    and a meta record into gates/raw/16-1/.
 * Needs the harness collector on 127.0.0.1:4317 and gates/bin/window-stage
 * (swiftc -O gates/scripts/window-stage.swift -o gates/bin/window-stage).
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CONFORMANCE_SCENARIOS } from "./conformance-scenarios.ts";

const STATES = ["focused", "unfocused", "occluded", "minimised"] as const;
type WindowState = (typeof STATES)[number];


const OWN = resolve(import.meta.dirname, "..", "..");
const HARNESS = resolve(OWN, "..", "harness");
const RAW = join(OWN, "gates", "raw", "16-1");
const STAGER_DELAY_MS = 1_000;

interface Args {
  readonly state: WindowState;
  readonly repeats: number;
  readonly binary: string;
  readonly label: string;
  /**
   * "default" leaves Tauri's background_throttling unset; "disabled" forces it off via the env var
   * (c15-style binaries only); "config" means the binary's own window config decides (gate builds
   * since 2026-11-11 declare backgroundThrottling "disabled"), recorded as KM_BACKGROUND_THROTTLING=config.
   */
  readonly throttling: "default" | "disabled" | "config";
  /** Passed to window-stage --style (occluded: titled | borderless). */
  readonly stagerStyle: string;
}

function isState(value: string): value is WindowState {
  return (STATES as readonly string[]).includes(value);
}

function parseArgs(argv: readonly string[]): Args {
  const v = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) v.set(argv[i] ?? "", argv[i + 1] ?? "");
  const state = v.get("--state") ?? "";
  if (!isState(state)) throw new Error(`--state ${STATES.join("|")}`);
  const label = v.get("--label") ?? "own-gate";
  if (!/^[a-z0-9-]+$/.test(label)) throw new Error("--label must be kebab-case");
  const throttling = v.get("--throttling") ?? "default";
  if (throttling !== "default" && throttling !== "disabled" && throttling !== "config") throw new Error("--throttling default|disabled|config");
  const stagerStyle = v.get("--stager-style") ?? "titled";
  if (stagerStyle !== "titled" && stagerStyle !== "borderless") throw new Error("--stager-style titled|borderless");
  return { state, repeats: Number(v.get("--repeats") ?? "6"), binary: resolve(v.get("--binary") ?? join(OWN, "gates", "bin", "km-spike-own-gate")), label, throttling, stagerStyle };
}

/** A locked macOS session makes loginwindow frontmost, so no window state can be produced (2026-11-11 runs). */
function screenIsLocked(): boolean {
  if (process.platform !== "darwin") return false;
  const out = spawnSync("ioreg", ["-n", "Root", "-d1", "-a"], { encoding: "utf8" }).stdout ?? "";
  return /<key>CGSSessionScreenIsLocked<\/key>\s*<true\/>/.test(out);
}

function waitExit(child: ChildProcess): Promise<number | null> {
  return new Promise((done) => child.on("exit", (code) => done(code)));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.binary)) throw new Error(`${args.binary} missing: node gates/scripts/build-gate-shell.ts`);
  if (screenIsLocked()) throw new Error("screen is locked (CGSSessionScreenIsLocked): window states cannot be produced; unlock and re-run");
  mkdirSync(RAW, { recursive: true });
  const prototype = `${args.label}-${args.state}`;
  const driverArgs = [
    "src/webview-driver/tauri-run.ts", "--binary", args.binary, "--prototype", prototype, "--mode", "conformance",
    "--repeats", String(args.repeats), "--scenarios", CONFORMANCE_SCENARIOS.join(","), "--no-axe", "--timeout-min", "60",
  ];
  // The shell keeps WebKit's policy only for KM_BACKGROUND_THROTTLING=default; any other value disables throttling.
  const env = { ...process.env, KM_BACKGROUND_THROTTLING: args.throttling };
  const startedAt = new Date().toISOString();
  const driver = spawn("node", driverArgs, { cwd: HARNESS, env, stdio: ["ignore", "pipe", "inherit"] });
  let runId: string | null = null;
  driver.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    process.stdout.write(text);
    runId ??= /run ([a-z0-9-]+): \d+ steps/.exec(text)?.[1] ?? null;
  });
  const driverExit = waitExit(driver);
  await new Promise((r) => setTimeout(r, STAGER_DELAY_MS));
  if (runId === null) throw new Error("driver did not report its run id");
  const id: string = runId;
  const stagerLog = join(RAW, `window-${id}.jsonl`);
  const stager = spawn(join(OWN, "gates", "bin", "window-stage"), ["--mode", args.state, "--owner", basename(args.binary), "--style", args.stagerStyle], { stdio: ["ignore", "pipe", "inherit"] });
  stager.stdout?.pipe(createWriteStream(stagerLog));
  const code = await driverExit;
  stager.kill("SIGTERM");
  await waitExit(stager);
  const collector = join(HARNESS, "reports", "spike-report", `${id}.jsonl`);
  if (existsSync(collector)) copyFileSync(collector, join(RAW, `tauri-${id}.jsonl`));
  writeFileSync(join(RAW, `meta-${id}.json`), `${JSON.stringify({
    runId: id, state: args.state, repeats: args.repeats, binary: args.binary, startedAt, endedAt: new Date().toISOString(), driverExit: code,
    env: { KM_BACKGROUND_THROTTLING: env.KM_BACKGROUND_THROTTLING }, driverCommand: ["node", ...driverArgs].join(" "),
    stagerCommand: `gates/bin/window-stage --mode ${args.state} --owner ${basename(args.binary)} --style ${args.stagerStyle} (started ${STAGER_DELAY_MS} ms after the driver)`,
  }, null, 2)}\n`);
  process.stdout.write(`state ${args.state}: run ${id}, driver exit ${String(code)}; raw in ${RAW}\n`);
  if (code !== 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
