/**
 * Boundary verdict from the gate scenarios only (contract amendment 2).
 *
 * Reads a Playwright JSON report and decides PASS or FAIL from the user-task
 * scenarios WC-1 to WC-9, WC-11 (notes still work) and WC-12. Within each gate
 * scenario the @value-critical tests decide; @negative-control tests and every
 * other scenario (WR-*, WC-10, the WC-11 pin checks) are recorded as signals.
 * WC-13 is decided by the axe and UI reviews, not by this report.
 *
 * Usage: node tooling/release/src/gate-verdict.ts <playwright.json> [project]
 * Exit: 0 PASS, 1 FAIL, 2 unreadable input or a gate scenario with no test.
 */
import { readFileSync } from "node:fs";

const GATE_SCENARIOS = [
  "WC-1",
  "WC-2",
  "WC-3",
  "WC-4",
  "WC-5",
  "WC-6",
  "WC-7",
  "WC-8",
  "WC-9",
  "WC-11",
  "WC-12",
] as const;
const WC11_NOTES_TITLE = "a note can be created and appears in the saved list";
const VALUE_CRITICAL = "value-critical";

type Outcome = "PASS" | "FAIL" | "NOT_EXERCISED";

interface TestEntry {
  readonly projectName: string;
  readonly status: string;
  readonly results: readonly {
    readonly status: string;
    readonly error?: { readonly message?: string };
  }[];
}
interface SpecEntry {
  readonly title: string;
  readonly file: string;
  readonly tags: readonly string[];
  readonly tests: readonly TestEntry[];
}
interface SuiteEntry {
  readonly specs?: readonly SpecEntry[];
  readonly suites?: readonly SuiteEntry[];
}
interface Row {
  readonly scenario: string;
  readonly title: string;
  readonly project: string;
  readonly outcome: Outcome;
  readonly gate: boolean;
  readonly firstError: string;
}

function collectSpecs(suites: readonly SuiteEntry[]): SpecEntry[] {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...collectSpecs(suite.suites ?? [])]);
}

function outcomeOf(test: TestEntry): Outcome {
  if (test.status === "skipped") return "NOT_EXERCISED";
  return test.status === "expected" ? "PASS" : "FAIL";
}

function scenarioOf(spec: SpecEntry): string {
  return spec.tags.find((tag) => /^(WC|WR)-\d+$/.test(tag)) ?? "untagged";
}

function isGate(spec: SpecEntry, scenario: string): boolean {
  if (!(GATE_SCENARIOS as readonly string[]).includes(scenario)) return false;
  if (!spec.tags.includes(VALUE_CRITICAL)) return false;
  return scenario !== "WC-11" || spec.title === WC11_NOTES_TITLE;
}

function rowsOf(specs: readonly SpecEntry[], project: string): Row[] {
  return specs.flatMap((spec) => {
    const scenario = scenarioOf(spec);
    return spec.tests
      .filter((test) => test.projectName === project)
      .map((test) => ({
        scenario,
        title: spec.title,
        project,
        outcome: outcomeOf(test),
        gate: isGate(spec, scenario),
        firstError: (test.results.at(-1)?.error?.message ?? "").split("\n")[0]?.slice(0, 200) ?? "",
      }));
  });
}

function scenarioVerdict(rows: readonly Row[], scenario: string): Outcome {
  const gateRows = rows.filter((row) => row.gate && row.scenario === scenario);
  if (gateRows.length === 0 || gateRows.every((row) => row.outcome === "NOT_EXERCISED"))
    return "NOT_EXERCISED";
  return gateRows.some((row) => row.outcome !== "PASS") ? "FAIL" : "PASS";
}

function main(argv: readonly string[]): number {
  const [reportPath, project = "packaged"] = argv;
  if (reportPath === undefined) {
    process.stderr.write("usage: gate-verdict.ts <playwright.json> [project]\n");
    return 2;
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
    readonly suites: readonly SuiteEntry[];
  };
  const rows = rowsOf(collectSpecs(report.suites), project);
  const verdicts = GATE_SCENARIOS.map((scenario) => ({
    scenario,
    outcome: scenarioVerdict(rows, scenario),
  }));
  const pass = verdicts.every((v) => v.outcome === "PASS");
  const summary = {
    verdict: pass ? "PASS" : "FAIL",
    project,
    gate: verdicts,
    wc13: "decided by the axe and UI reviews, not this report",
    gateFailures: rows.filter((row) => row.gate && row.outcome !== "PASS"),
    signals: rows
      .filter((row) => !row.gate)
      .map(({ scenario, title, outcome, firstError }) => ({
        scenario,
        title,
        outcome,
        firstError,
      })),
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (verdicts.some((v) => v.outcome === "FAIL")) return 1;
  return pass ? 0 : 2;
}

process.exitCode = main(process.argv.slice(2));
