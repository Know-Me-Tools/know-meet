/**
 * Gate 16.4 (c16): runs the accessibility suite (checks/a11y.spec.ts, 8 tests)
 * and the 8 A2UI golden surfaces (checks/a2ui-surfaces.spec.ts) inside the Tauri
 * WKWebView shell with trusted OS-level keyboard and pointer input.
 *
 *   node src/webview-driver/a11y/a11y-run.ts --binary <path> --prototype <own|hybrid> --out <dir> [--only stream,focus,...]
 *
 * Needs: the harness server on :4317 (`pnpm serve`), the km-input helper
 * (swiftc -O src/webview-driver/trusted-input/km-input.swift -o reports/webview-driver/km-input)
 * and the Accessibility permission for the calling terminal. One app launch per
 * procedure; the collector's JSONL for each launch is copied into <out>.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import type { A11yKind } from "./a11y-types.ts";
import { A11ySession, HARNESS, KM_INPUT } from "./a11y-session.ts";
import { alertCheck, decisionCheck, focusCheck, keyboardFormCheck, streamChecks, surfaceCheck, type CheckOutcome } from "./a11y-procedures.ts";

interface Args {
  readonly binary: string;
  readonly prototype: string;
  readonly out: string;
  readonly only: readonly string[] | null;
}

function parseArgs(argv: readonly string[]): Args {
  const v = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) v.set(argv[i] ?? "", argv[i + 1] ?? "");
  const binary = v.get("--binary") ?? "";
  const prototype = v.get("--prototype") ?? "";
  const out = v.get("--out") ?? "";
  if (binary === "" || out === "" || !/^[a-z0-9-]+$/.test(prototype)) throw new Error("--binary <path> --prototype <name> --out <dir> are required");
  const only = v.get("--only");
  return { binary, prototype, out, only: only === undefined ? null : only.split(",") };
}

interface Plan {
  readonly name: string;
  readonly kind: A11yKind;
  readonly scenarioId: string;
  readonly surfaceId: string | null;
  readonly run: (s: A11ySession) => Promise<CheckOutcome[]>;
}

async function surface(id: string): Promise<GoldenSurfaceFile> {
  const res = await fetch(`${HARNESS}/a2ui/surfaces/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`surface ${id}: ${res.status}`);
  return (await res.json()) as GoldenSurfaceFile;
}

async function plans(): Promise<Plan[]> {
  const list: Plan[] = [
    { name: "stream", kind: "stream", scenarioId: "long-markdown", surfaceId: null, run: streamChecks },
    { name: "focus", kind: "focus", scenarioId: "hitl-approve", surfaceId: null, run: focusCheck },
    { name: "approve", kind: "approve", scenarioId: "hitl-approve", surfaceId: null, run: (s) => decisionCheck(s, "approve") },
    { name: "reject", kind: "reject", scenarioId: "hitl-reject", surfaceId: null, run: (s) => decisionCheck(s, "reject") },
    { name: "alert", kind: "alert", scenarioId: "run-error", surfaceId: null, run: alertCheck },
  ];
  const { scenarios } = (await (await fetch(`${HARNESS}/scenarios`)).json()) as { scenarios: { id: string }[] };
  for (const id of scenarios.map((x) => x.id).filter((x) => x.startsWith("a2ui/"))) {
    const surfaceId = id.slice("a2ui/".length);
    const file = await surface(surfaceId);
    list.push({ name: id, kind: "a2ui", scenarioId: id, surfaceId, run: (s) => surfaceCheck(s, file) });
    if (surfaceId === "form-validation") list.push({ name: "a2ui-keyboard", kind: "a2ui-keyboard", scenarioId: id, surfaceId, run: (s) => keyboardFormCheck(s, file) });
  }
  return list;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(KM_INPUT)) throw new Error(`${KM_INPUT} missing: build trusted-input/km-input.swift first`);
  mkdirSync(args.out, { recursive: true });
  const all = await plans();
  const selected = args.only === null ? all : all.filter((p) => args.only?.includes(p.name) === true);
  const results: CheckOutcome[] = [];
  const failures: { plan: string; runId: string; error: string }[] = [];
  for (const plan of selected) {
    const s = A11ySession.create(args.binary, args.prototype, plan.kind, plan.scenarioId, plan.surfaceId, true);
    process.stdout.write(`${plan.name}: ${s.config.runId}\n`);
    try {
      const out = await plan.run(s);
      results.push(...out);
      for (const o of out) process.stdout.write(`  ${o.pass ? "PASS" : "FAIL"} ${o.id}${o.pass ? "" : `: ${o.details.filter((d) => d.startsWith("FAIL")).join(" | ")}`}\n`);
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : String(e);
      failures.push({ plan: plan.name, runId: s.config.runId, error });
      process.stdout.write(`  ERROR ${error}\n`);
    } finally {
      s.stop();
      if (existsSync(s.jsonlPath)) copyFileSync(s.jsonlPath, join(args.out, `${s.config.runId}.jsonl`));
      await new Promise((r) => setTimeout(r, 1_500));
    }
  }
  const file = join(args.out, `${args.prototype}-results-${Date.now().toString(36)}.json`);
  writeFileSync(file, `${JSON.stringify({ prototype: args.prototype, binary: args.binary, results, failures }, null, 2)}\n`);
  process.stdout.write(`${results.filter((r) => r.pass).length}/${results.length} pass, ${failures.length} errors -> ${file}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
