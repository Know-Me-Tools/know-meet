/**
 * Driver parity check: runs the same in-webview driver inside a Playwright
 * browser (no Playwright interaction, only an init script), so its verdicts can
 * be compared with the Playwright check suite on the same prototype. A driver
 * that agrees with the checks in a browser makes Tauri-only failures
 * attributable to the webview, not to the driver.
 *
 *   node src/webview-driver/browser-dry-run.ts --url http://127.0.0.1:4173/ --prototype own [--browser webkit] [--scenarios a,b]
 */
import { webkit, chromium } from "@playwright/test";
import { HOSTILE_MESSAGE_ID } from "../corpus-authoring/hostile/hostile-corpus.ts";
import type { DriverStep, ReportProgress } from "../domain/spike-report.ts";
import { buildDriverScript } from "./build-driver.ts";

const HARNESS = "http://127.0.0.1:4317";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const url = arg("--url") ?? "";
  const prototype = arg("--prototype") ?? "";
  const browserName = arg("--browser") ?? "webkit";
  if (url === "" || !/^[a-z0-9-]+$/.test(prototype)) throw new Error("--url and --prototype are required");
  let ids = arg("--scenarios")?.split(",");
  if (ids === undefined) {
    const { scenarios } = await getJson<{ scenarios: { id: string; family: string }[] }>(`${HARNESS}/scenarios`);
    ids = scenarios.filter((s) => s.family === "ag-ui" || s.family === "hostile").map((s) => s.id);
  }
  const plan: DriverStep[] = ids.map((scenarioId) => ({ scenarioId, repeat: 1, mode: "conformance" }));
  const runId = `${prototype}-dryrun-${browserName}-${Date.now().toString(36)}`;
  const script = buildDriverScript({ runId, prototype, harnessUrl: HARNESS, appUrl: url, plan, hostileMessageId: HOSTILE_MESSAGE_ID, axe: true, verdictPollMs: 10_000 });
  const browser = await (browserName === "chromium" ? chromium : webkit).launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    await page.addInitScript({ content: script });
    await page.goto(url);
    const deadline = Date.now() + 60 * 60_000;
    for (;;) {
      await new Promise((r) => setTimeout(r, 2_000));
      const p = await getJson<ReportProgress>(`${HARNESS}/spike-report/${runId}/progress`);
      if (p.done) break;
      if (Date.now() > deadline) throw new Error("dry run timed out");
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(`dry run ${runId} done: reports/spike-report/${runId}.jsonl\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
