import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { listFiles } from "../src/support/digests.ts";
import { repoPath } from "../src/support/repo-paths.ts";
import { combinedOutput } from "../src/support/run-command.ts";
import { scratchTempDir } from "../src/support/scratch-worktree.ts";
import { lastRun, runAndRecord } from "./common.steps.ts";
import { Given, type ScenarioState, Then, When } from "./fixtures.ts";

/**
 * Generator interface this scenario relies on (requested from design-lead,
 * c04): `generate -- --tokens <tokens.json> --out <dir>` writes every output
 * (web CSS, shadcn variables, Tailwind @theme, Dart tokens/ThemeData) below
 * <dir>, deterministically, and exits non-zero on an invalid value or a
 * missing output directory.
 */
const GENERATE = "pnpm --filter @know-meet/design-tokens generate --";

interface TokenScratch {
  readonly tokens: string;
  readonly baselineOut: string;
  readonly out: string;
  readonly root: string;
}

const scratches = new WeakMap<ScenarioState, TokenScratch>();

function scratchOf(scenario: ScenarioState): TokenScratch {
  const value = scratches.get(scenario);
  if (value === undefined) throw new Error("No scratch tokens.json in this scenario");
  return value;
}

function changedLines(before: string, after: string): Array<{ file: string; line: string }> {
  const out: Array<{ file: string; line: string }> = [];
  const files = new Set([...listFiles(before), ...listFiles(after)]);
  for (const file of files) {
    const a = existsSync(join(before, file))
      ? readFileSync(join(before, file), "utf8").split("\n")
      : [];
    const b = existsSync(join(after, file))
      ? readFileSync(join(after, file), "utf8").split("\n")
      : [];
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1)
      if (a[index] !== b[index])
        out.push({ file, line: b[index] ?? `<removed> ${a[index] ?? ""}` });
  }
  return out;
}

const changes = new WeakMap<ScenarioState, Array<{ file: string; line: string }>>();

Given("a scratch copy of {string}", async ({ scenario }, path: string) => {
  const scratch = scratchTempDir("vs4-tokens");
  scenario.cleanups.push(() => scratch.remove());
  const tokens = join(scratch.dir, "tokens.json");
  cpSync(repoPath(path), tokens);
  scratches.set(scenario, {
    root: scratch.dir,
    tokens,
    baselineOut: join(scratch.dir, "out-before"),
    out: join(scratch.dir, "out-after"),
  });
});

Given(
  "the generator outputs for the unmodified scratch copy are recorded in a scratch directory",
  async ({ scenario, $testInfo }) => {
    const s = scratchOf(scenario);
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      `mkdir -p "${s.baselineOut}" && ${GENERATE} --tokens "${s.tokens}" --out "${s.baselineOut}"`,
    );
    expect(lastRun(scenario).exitCode, combinedOutput(lastRun(scenario))).toBe(0);
    expect(listFiles(s.baselineOut).length).toBeGreaterThan(0);
  },
);

When(
  "the dark theme token {string} is changed to {string} in the scratch copy",
  async ({ scenario }, token: string, value: string) => {
    const s = scratchOf(scenario);
    const doc = JSON.parse(readFileSync(s.tokens, "utf8")) as {
      themes: { dark: Record<string, string> };
    };
    expect(doc.themes.dark[token], `token ${token} exists`).toBeDefined();
    doc.themes.dark[token] = value;
    writeFileSync(s.tokens, `${JSON.stringify(doc, null, 2)}\n`);
  },
);

When(
  "the generator runs with {string} on the scratch copy",
  async ({ scenario, $testInfo }, command: string) => {
    expect(command).toBe("pnpm --filter @know-meet/design-tokens generate");
    const s = scratchOf(scenario);
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      `mkdir -p "${s.out}" && ${GENERATE} --tokens "${s.tokens}" --out "${s.out}"`,
    );
    changes.set(
      scenario,
      lastRun(scenario).exitCode === 0 ? changedLines(s.baselineOut, s.out) : [],
    );
  },
);

When("the generator runs on the scratch copy", async ({ scenario, $testInfo }) => {
  const s = scratchOf(scenario);
  await runAndRecord(
    scenario,
    (n, o) => $testInfo.attach(n, o),
    `mkdir -p "${s.out}" && ${GENERATE} --tokens "${s.tokens}" --out "${s.out}"`,
  );
});

When(
  "the generator runs on the scratch copy with an output directory that does not exist",
  async ({ scenario, $testInfo }) => {
    const s = scratchOf(scenario);
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      `${GENERATE} --tokens "${s.tokens}" --out "${join(s.root, "missing", "out")}"`,
    );
  },
);

const changedOf = (scenario: ScenarioState): Array<{ file: string; line: string }> =>
  changes.get(scenario) ?? [];

Then(
  "the web CSS variable {string} for the dark theme is {string}",
  async ({ scenario }, variable: string, value: string) => {
    const hit = changedOf(scenario).find(
      (c) =>
        c.file.endsWith(".css") &&
        c.line.includes(`${variable}:`) &&
        c.line.toLowerCase().includes(value.toLowerCase()),
    );
    expect(hit, `a changed CSS line sets ${variable} to ${value}`).toBeDefined();
  },
);

Then(
  "the Tailwind theme value for {string} in the dark theme is {string}",
  async ({ scenario }, token: string, value: string) => {
    const s = scratchOf(scenario);
    const themeFiles = listFiles(s.out).filter(
      (f) => f.endsWith(".css") && readFileSync(join(s.out, f), "utf8").includes("@theme"),
    );
    expect(themeFiles.length, "a Tailwind @theme output exists").toBeGreaterThan(0);
    const text = themeFiles
      .map((f) => readFileSync(join(s.out, f), "utf8"))
      .join("\n")
      .toLowerCase();
    expect(text).toMatch(
      new RegExp(`--color-${token}\\s*:\\s*(${value.toLowerCase()}|var\\(--${token}\\))`),
    );
  },
);

Then(
  "the Dart dark-theme constant for {string} is the colour {word}",
  async ({ scenario }, token: string, colour: string) => {
    const hit = changedOf(scenario).find(
      (c) => c.file.endsWith(".dart") && c.line.toUpperCase().includes(colour.toUpperCase()),
    );
    expect(hit, `a changed Dart line for ${token} holds ${colour}`).toBeDefined();
  },
);

Then("no other output line differs from the recorded outputs", async ({ scenario, $testInfo }) => {
  const all = changedOf(scenario);
  await $testInfo.attach("vs-4-output-diff.json", {
    body: JSON.stringify(all, null, 2),
    contentType: "application/json",
  });
  const unrelated = all.filter((c) => !/123456/i.test(c.line));
  expect(unrelated).toEqual([]);
  expect(
    new Set(all.map((c) => c.file.split(".").pop())).size,
    "CSS and Dart outputs changed",
  ).toBeGreaterThanOrEqual(2);
});

Then("its error output names the token {string}", async ({ scenario }, token: string) => {
  expect(combinedOutput(lastRun(scenario))).toContain(token);
});

Then("no output file is written", async ({ scenario }) => {
  expect(existsSync(join(scratchOf(scenario).root, "missing"))).toBe(false);
});
