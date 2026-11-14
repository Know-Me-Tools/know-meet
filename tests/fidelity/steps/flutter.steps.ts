import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import {
  checkGoldenProvenance,
  dartColourLiteral,
  type GoldenApproval,
  type ProvenanceFinding,
} from "../src/flutter/golden-provenance.ts";
import { listFiles } from "../src/support/digests.ts";
import { repoPath, TOKENS_JSON } from "../src/support/repo-paths.ts";
import { combinedOutput } from "../src/support/run-command.ts";
import { scratchTempDir } from "../src/support/scratch-worktree.ts";
import { lastRun, runAndRecord } from "./common.steps.ts";
import { Given, type ScenarioState, Then, When } from "./fixtures.ts";

const GOLDENS = "apps/mobile/test/goldens";
const STOCK_THEME_DEFINE = "--dart-define=KM_GOLDEN_THEME_OVERRIDE=stock-dark";
const findings = new WeakMap<ScenarioState, ProvenanceFinding[]>();
const dartSources = new WeakMap<ScenarioState, string>();
let stockThemeRequested = false;

// biome-ignore lint/correctness/noEmptyPattern: Playwright reads the first parameter of a fixture or step and requires an object-destructuring pattern, even when no fixture is used.
Given("the Flutter golden provenance rule {string}", async ({}, path: string) => {
  const rule = JSON.parse(readFileSync(repoPath(path), "utf8")) as {
    approver: string;
    goldensDir: string;
  };
  expect(rule.approver).toBe("design-lead");
  expect(rule.goldensDir).toBe(GOLDENS);
});

Then(
  "every golden under {string} has an approval by design-lead in its approvals record",
  async ({ scenario, manifest, $testInfo }, dir: string) => {
    const result = checkGoldenProvenance(repoPath(dir), dir, manifest);
    findings.set(scenario, result);
    await $testInfo.attach("golden-provenance.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
    expect(
      result.filter((f) =>
        /no approval|decision|not design-lead|missing approvals|no golden/.test(f.problem),
      ),
    ).toEqual([]);
  },
);

Then(
  "each approval's golden digest, prototype baseline digest and tokens.json digest are current",
  async ({ scenario }) => {
    expect(findings.get(scenario) ?? []).toEqual([]);
  },
);

When(
  "the golden suite runs with {string} in {string}",
  async ({ scenario, $testInfo }, command: string, dir: string) => {
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      `${command} --reporter expanded`,
      repoPath(dir),
    );
  },
);

Then("the run compared a golden for each approved state in both themes", async ({ scenario }) => {
  const approvals = (
    JSON.parse(readFileSync(repoPath(`${GOLDENS}/approvals.json`), "utf8")) as {
      approvals: GoldenApproval[];
    }
  ).approvals.filter((a) => a.decision === "approved");
  const output = combinedOutput(lastRun(scenario));
  expect(new Set(approvals.map((a) => a.theme))).toEqual(new Set(["dark", "light"]));
  const unexercised = approvals.filter((a) => !output.includes(a.stateId));
  expect(
    unexercised.map((a) => `${a.stateId}/${a.theme}`),
    "golden tests must name the state ID they render",
  ).toEqual([]);
});

When("the generated Dart tokens are compared with {string}", async ({ scenario }, path: string) => {
  expect(repoPath(path)).toBe(TOKENS_JSON);
  const dartFiles = listFiles(repoPath("apps/mobile/lib")).filter((f) => f.endsWith("tokens.dart"));
  expect(dartFiles.length, "a generated tokens.dart under apps/mobile/lib").toBeGreaterThan(0);
  dartSources.set(
    scenario,
    dartFiles
      .map((f) => readFileSync(repoPath(`apps/mobile/lib/${f}`), "utf8"))
      .join("\n")
      .toUpperCase(),
  );
});

function tokenThemes(): Array<Record<string, string>> {
  const doc = JSON.parse(readFileSync(TOKENS_JSON, "utf8")) as {
    themes: { dark: Record<string, string>; light: Record<string, string> };
  };
  return [doc.themes.dark, doc.themes.light];
}

Then(
  "every hex colour token of each theme appears as its Dart ARGB literal",
  async ({ scenario }) => {
    const dart = dartSources.get(scenario) ?? "";
    const missing = tokenThemes().flatMap((theme) =>
      Object.entries(theme).flatMap(([name, value]) => {
        const literal = dartColourLiteral(value);
        return literal !== null && !dart.includes(literal)
          ? [`${name} ${value} -> ${literal}`]
          : [];
      }),
    );
    expect(missing).toEqual([]);
  },
);

Then("every pixel size token appears as its numeric value", async ({ scenario }) => {
  const dart = dartSources.get(scenario) ?? "";
  const missing = tokenThemes().flatMap((theme) =>
    Object.entries(theme).flatMap(([name, value]) => {
      const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
      if (match?.[1] === undefined) return [];
      const n = match[1];
      return new RegExp(`\\b${n.replace(".", "\\.")}(\\.0)?\\b`).test(dart)
        ? []
        : [`${name} ${value}`];
    }),
  );
  expect(missing).toEqual([]);
});

Given("the golden suite is configured to build the app with stock ThemeData.dark\\()", async () => {
  stockThemeRequested = true;
});

When("the golden suite runs with that configuration", async ({ scenario, $testInfo }) => {
  expect(stockThemeRequested).toBe(true);
  await runAndRecord(
    scenario,
    (n, o) => $testInfo.attach(n, o),
    `flutter test --tags golden ${STOCK_THEME_DEFINE}`,
    repoPath("apps/mobile"),
  );
});

Then("the command exits non-zero with at least one golden mismatch", async ({ scenario }) => {
  const run = lastRun(scenario);
  expect(run.exitCode).not.toBe(0);
  expect(combinedOutput(run)).toMatch(/golden|Pixel test failed|did not match/i);
});

Given(
  "a scratch goldens directory containing one golden absent from the approvals record",
  async ({ scenario }) => {
    const scratch = scratchTempDir("vs3-goldens");
    scenario.cleanups.push(() => scratch.remove());
    cpSync(repoPath(GOLDENS), scratch.dir, { recursive: true });
    const first = listFiles(scratch.dir).find((f) => f.endsWith(".png"));
    if (first === undefined) throw new Error(`${GOLDENS} has no goldens`);
    const bytes = readFileSync(join(scratch.dir, first));
    writeFileSync(
      join(scratch.dir, "unapproved-negative-control.png"),
      Buffer.concat([bytes, Buffer.from([0])]),
    );
    scenario.scratchDir = scratch.dir;
  },
);

When("the provenance check runs on the scratch directory", async ({ scenario, manifest }) => {
  findings.set(scenario, checkGoldenProvenance(scenario.scratchDir ?? "", GOLDENS, manifest));
});

Then("it fails and names the unapproved golden", async ({ scenario }) => {
  const result = findings.get(scenario) ?? [];
  expect(
    result.some(
      (f) =>
        f.golden.endsWith("unapproved-negative-control.png") && f.problem.startsWith("no approval"),
    ),
  ).toBe(true);
});
