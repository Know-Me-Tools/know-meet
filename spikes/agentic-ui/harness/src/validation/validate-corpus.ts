/**
 * Validates the committed corpus JSON (not the TS definitions) and writes
 * reports/corpus-validation.json. Exit code 1 on any problem.
 * Usage: node src/validation/validate-corpus.ts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GoldenSurfaceFile } from "../domain/a2ui-surface.ts";
import type { HostileCorpusFile } from "../domain/hostile.ts";
import type { ScenarioFile } from "../domain/scenario.ts";
import { AG_UI_CORE_PACKAGE, A2UI_WEB_CORE_PACKAGE } from "../domain/versions.ts";
import { wrapSurfaceAsScenario } from "../corpus-authoring/a2ui/a2ui-wrap.ts";
import { wrapHostileAsScenario } from "../corpus-authoring/hostile/hostile-corpus.ts";
import { CORPUS_PATHS, REPORTS_DIR } from "../shared/paths.ts";
import { validateScenarioA2ui, validateSurface, type A2uiReport } from "./validate-a2ui.ts";
import { missingEventTypes, validateScenario, type ScenarioReport } from "./validate-ag-ui.ts";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function readJsonDir<T>(dir: string): T[] {
  return readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .map((n) => {
      const parsed: T = JSON.parse(readFileSync(join(dir, n), "utf8"));
      return parsed;
    });
}

function hostileProblems(corpus: HostileCorpusFile): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const item of corpus.items) {
    if (!KEBAB.test(item.id)) problems.push(`hostile id not kebab-case: ${item.id}`);
    if (ids.has(item.id)) problems.push(`duplicate hostile id: ${item.id}`);
    ids.add(item.id);
    if (item.expectedOutcome.trim().length < 20) problems.push(`${item.id}: expectedOutcome too vague`);
  }
  return problems;
}

function main(): void {
  const scenarios = readJsonDir<ScenarioFile>(CORPUS_PATHS.scenarios);
  const surfaces = readJsonDir<GoldenSurfaceFile>(CORPUS_PATHS.surfaces);
  const hostileParsed: HostileCorpusFile = JSON.parse(readFileSync(CORPUS_PATHS.hostile, "utf8"));

  const scenarioReports: ScenarioReport[] = scenarios.map(validateScenario);
  const wrappedReports: ScenarioReport[] = [
    ...surfaces.map((s) => validateScenario(wrapSurfaceAsScenario(s))),
    ...hostileParsed.items.map((i) => validateScenario(wrapHostileAsScenario(i))),
  ];
  const surfaceReports: A2uiReport[] = surfaces.map(validateSurface);
  const activityReports = scenarios.map(validateScenarioA2ui).filter((r): r is A2uiReport => r !== null);
  const missing = missingEventTypes(scenarioReports);
  const hostile = hostileProblems(hostileParsed);

  const failures = [
    ...[...scenarioReports, ...wrappedReports].filter((r) => !r.ok).map((r) => `scenario ${r.id}: ${r.problems.join(" | ")}`),
    ...[...surfaceReports, ...activityReports].filter((r) => !r.ok).map((r) => `a2ui ${r.id}: ${r.problems.join(" | ")} :: ${r.errors.join(" ; ").slice(0, 600)}`),
    ...missing.map((t) => `event type never exercised: ${t}`),
    ...hostile,
  ];

  const report = {
    validatedAt: new Date().toISOString(),
    validators: { agUi: `${AG_UI_CORE_PACKAGE} (@ag-ui/core/schemas EventSchema)`, a2ui: `${A2UI_WEB_CORE_PACKAGE} (MessageProcessor, STRICT_VALIDATION, basic catalog v1)` },
    counts: { scenarios: scenarios.length, surfaces: surfaces.length, hostileItems: hostileParsed.items.length, wrappedScenarios: wrappedReports.length },
    eventTypeCoverage: { covered: [...new Set(scenarioReports.flatMap((r) => r.eventTypes))].sort(), missing },
    scenarios: scenarioReports,
    wrappedScenarios: wrappedReports.map((r) => ({ id: r.id, ok: r.ok, problems: r.problems })),
    surfaces: surfaceReports,
    activityA2ui: activityReports,
    failures,
  };
  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(join(REPORTS_DIR, "corpus-validation.json"), `${JSON.stringify(report, null, 2)}\n`);

  for (const r of scenarioReports) {
    const invalid = r.runs.map((run) => run.schemaInvalid.length + run.orderingInvalid.length).reduce((a, b) => a + b, 0);
    process.stdout.write(`${r.ok ? "PASS" : "FAIL"} scenario ${r.id} (${r.runs.length} runs, ${invalid} invalid items)\n`);
  }
  for (const r of surfaceReports) process.stdout.write(`${r.ok ? "PASS" : "FAIL"} surface ${r.id} (${r.errors.length} strict errors)\n`);
  process.stdout.write(`wrapped scenarios: ${wrappedReports.filter((r) => r.ok).length}/${wrappedReports.length} pass\n`);
  process.stdout.write(`event types covered: ${report.eventTypeCoverage.covered.length}, missing: ${missing.length}\n`);
  if (failures.length > 0) {
    process.stdout.write(`\n${failures.length} problem(s):\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("corpus valid\n");
  }
}

main();
