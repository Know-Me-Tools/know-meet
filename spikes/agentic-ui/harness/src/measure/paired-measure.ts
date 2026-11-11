/**
 * Gate 16.3: interleaved, randomised paired runs of H and O to render-complete.
 *
 *   node src/measure/paired-measure.ts --hybrid-url <url> --own-url <url> --label noprof \
 *     --out <dir> [--browsers chromium,webkit] [--repeats 10] [--scenarios a,b] [--seed 163] [--repeat-start 1]
 *
 * For each browser and repetition the scenario order is shuffled, and for each scenario a seeded
 * coin decides whether H or O runs first; the other runs immediately after. Every run gets a fresh
 * browser context in one shared browser process per engine. The output file is rewritten after
 * every pair, so an interrupted run keeps its completed pairs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { arch, cpus, loadavg, platform, release, totalmem } from "node:os";
import { join } from "node:path";
import { chromium, webkit, type Browser } from "@playwright/test";
import { renderRun, QUIET_MS, type RenderRunResult } from "./render-run.ts";
import { mulberry32, shuffle } from "./paired-stats.ts";

interface Options {
  readonly hybridUrl: string;
  readonly ownUrl: string;
  readonly harnessUrl: string;
  readonly label: string;
  readonly out: string;
  readonly browsers: readonly ("chromium" | "webkit")[];
  readonly repeats: number;
  readonly scenarios: readonly string[];
  readonly seed: number;
  /** Number of the first repetition (re-runs of specific pairs keep their original repeat number). */
  readonly repeatStart: number;
}

const DEFAULT_SCENARIOS = [
  "a2ui-over-agui", "cancel-mid-stream", "custom-chunks", "disconnect-reconnect-replay", "hitl-approve", "hitl-expire",
  "hitl-reject", "long-markdown", "malformed-out-of-order", "parallel-tool-calls", "reasoning-subagents-snapshot",
  "run-cancelled-by-agent", "run-error", "state-snapshot-delta", "hostile/huge-table",
];

function parse(argv: readonly string[]): Options {
  const v = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i] ?? "";
    const value = argv[i + 1];
    if (!key.startsWith("--") || value === undefined) throw new Error(`bad argument near ${key}`);
    v.set(key, value);
  }
  const need = (k: string): string => {
    const x = v.get(k);
    if (x === undefined) throw new Error(`${k} is required`);
    return x;
  };
  const browsers = (v.get("--browsers") ?? "chromium,webkit").split(",").map((b) => {
    if (b !== "chromium" && b !== "webkit") throw new Error(`unknown browser ${b}`);
    return b;
  });
  const repeats = Number(v.get("--repeats") ?? "10");
  if (!Number.isInteger(repeats) || repeats < 1) throw new Error("--repeats must be a positive integer");
  return {
    hybridUrl: need("--hybrid-url"),
    ownUrl: need("--own-url"),
    harnessUrl: (v.get("--harness") ?? "http://127.0.0.1:4317").replace(/\/$/, ""),
    label: need("--label").replace(/[^a-z0-9-]/gi, "-"),
    out: need("--out"),
    browsers,
    repeats,
    scenarios: v.get("--scenarios")?.split(",").filter((s) => s !== "") ?? DEFAULT_SCENARIOS,
    seed: Number(v.get("--seed") ?? "163"),
    repeatStart: Number(v.get("--repeat-start") ?? "1"),
  };
}

async function prompts(o: Options): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const id of o.scenarios) {
    const res = await fetch(`${o.harnessUrl}/scenarios/${encodeURI(id)}`);
    if (!res.ok) throw new Error(`scenario ${id}: ${res.status}`);
    const body = (await res.json()) as { scenario: { userPrompt: string } };
    out.set(id, body.scenario.userPrompt);
  }
  return out;
}

interface OrderEntry {
  readonly repeat: number;
  readonly scenarioId: string;
  readonly first: "hybrid" | "own";
}

function describe(r: RenderRunResult): string {
  if (r.error !== null) return `ERROR ${r.error}`;
  const lt = r.longTaskTotalMs === null ? "" : ` lt ${r.longTaskTotalMs}`;
  const cpu = r.cpu === null ? "" : ` script ${r.cpu.scriptMs}`;
  return `rc ${r.renderCompleteMs} lag ${r.renderLagAfterSettleMs}${lt}${cpu} drop ${r.frameStats?.droppedFrames ?? "-"}`;
}

async function runBrowser(o: Options, name: "chromium" | "webkit", promptMap: Map<string, string>): Promise<void> {
  const rng = mulberry32(o.seed + (name === "webkit" ? 1000 : 0));
  const browser: Browser = await (name === "webkit" ? webkit : chromium).launch({ headless: true });
  const runs: RenderRunResult[] = [];
  const order: OrderEntry[] = [];
  const file = join(o.out, `${o.label}-${name}.json`);
  const startedAt = new Date().toISOString();
  const loadStart = loadavg();
  const write = (finished: boolean): void => {
    const report = {
      schemaVersion: 1,
      gate: "16.3",
      label: o.label,
      browser: `${name} ${browser.version()}`,
      startedAt,
      finishedAt: finished ? new Date().toISOString() : null,
      environment: {
        node: process.version, os: `${platform()} ${release()} ${arch()}`, cpu: cpus()[0]?.model ?? null, cpuCount: cpus().length,
        memoryBytes: totalmem(), loadavgAtStart: loadStart, loadavgAtEnd: finished ? loadavg() : null,
      },
      settings: {
        repeats: o.repeats, seed: o.seed, scenarios: o.scenarios, hybridUrl: o.hybridUrl, ownUrl: o.ownUrl, harnessUrl: o.harnessUrl,
        quietMs: QUIET_MS, pacing: "corpus defaults (no rate/gap overrides)", viewport: "1280x720",
      },
      order,
      runs,
    };
    writeFileSync(file, `${JSON.stringify(report, null, 1)}\n`);
  };
  try {
    for (let repeat = o.repeatStart; repeat < o.repeatStart + o.repeats; repeat += 1) {
      for (const scenarioId of shuffle(o.scenarios, rng)) {
        const first: "hybrid" | "own" = rng() < 0.5 ? "hybrid" : "own";
        order.push({ repeat, scenarioId, first });
        for (const prototype of first === "hybrid" ? (["hybrid", "own"] as const) : (["own", "hybrid"] as const)) {
          const result = await renderRun(browser, {
            prototype, browser: name, scenarioId, repeat, userPrompt: promptMap.get(scenarioId) ?? "",
            baseUrl: prototype === "hybrid" ? o.hybridUrl : o.ownUrl, harnessUrl: o.harnessUrl,
          });
          runs.push(result);
          process.stdout.write(`${name} r${repeat} ${scenarioId} ${prototype}: ${describe(result)} (load ${result.loadavg1})\n`);
        }
        write(false);
      }
    }
    write(true);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const o = parse(process.argv.slice(2));
  mkdirSync(o.out, { recursive: true });
  const promptMap = await prompts(o);
  for (const name of o.browsers) await runBrowser(o, name, promptMap);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
