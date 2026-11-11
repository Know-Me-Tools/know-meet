import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect } from "@playwright/test";
import { REPO_ROOT } from "../src/support/repo-paths.ts";
import { runCommand } from "../src/support/run-command.ts";
import { createScratchWorktree, scratchTempDir } from "../src/support/scratch-worktree.ts";
import { lastRun, runAndRecord } from "./common.steps.ts";
import { Given, type ScenarioState, Then, When } from "./fixtures.ts";

const LINE_LIMIT_PLUS_ONE = 501;

/* ---------------------------------------------------------------- VS-8 */

function scratchRepoWith(scenario: ScenarioState, relative: string, content: string): void {
  const scratch = scratchTempDir("vs8-repo");
  scenario.cleanups.push(() => scratch.remove());
  const git = runCommand("git init --quiet", scratch.dir);
  expect(git.exitCode, git.stderr).toBe(0);
  mkdirSync(dirname(join(scratch.dir, relative)), { recursive: true });
  writeFileSync(join(scratch.dir, relative), content);
  scenario.scratchDir = scratch.dir;
}

Given(
  "a scratch repository containing {string} with {int} lines",
  async ({ scenario }, relative: string, lines: number) => {
    expect(lines).toBe(LINE_LIMIT_PLUS_ONE);
    const body = Array.from(
      { length: lines },
      (_, index) => `export const line${index} = ${index};`,
    ).join("\n");
    scratchRepoWith(scenario, relative, `${body}\n`);
  },
);

Given("a scratch repository containing {string}", async ({ scenario }, relative: string) => {
  scratchRepoWith(scenario, relative, "export const MeetingTile = (): null => null;\n");
});

When("the line checker runs against the scratch repository", async ({ scenario, $testInfo }) => {
  await runAndRecord(
    scenario,
    (n, o) => $testInfo.attach(n, o),
    `node "${join(REPO_ROOT, "tooling/repo-rules/src/check-lines.ts")}" --cwd "${scenario.scratchDir ?? ""}"`,
  );
});

When(
  "the naming check runs against the scratch repository with the repository's ls-lint config",
  async ({ scenario, $testInfo }) => {
    const lsLint = join(REPO_ROOT, "node_modules", ".bin", "ls-lint");
    const config = join(REPO_ROOT, "tooling", "ls-lint", "ls-lint.yml");
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      `"${lsLint}" --config "${config}"`,
      scenario.scratchDir,
    );
  },
);

/* ---------------------------------------------------------------- VS-9 */

Given("a clean cargo target directory for this run", async ({ scenario }) => {
  const target = scratchTempDir("vs9-target");
  scenario.cleanups.push(() => target.remove());
  process.env["CARGO_TARGET_DIR"] = target.dir;
  scenario.cleanups.push(() => {
    delete process.env["CARGO_TARGET_DIR"];
  });
});

When(
  "the flutter_rust_bridge codegen runs with the repository's configuration",
  async ({ scenario, $testInfo }) => {
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      "flutter_rust_bridge_codegen generate",
      join(REPO_ROOT, "apps", "mobile"),
    );
  },
);

Then(
  "the generated binding files are byte-identical to the committed ones",
  async ({ $testInfo }) => {
    const diff = runCommand(
      "git status --porcelain -- apps/mobile/lib/src/rust apps/mobile/rust 'crates/**/frb_generated*'",
    );
    await $testInfo.attach("frb-diff.txt", {
      body: diff.stdout || "(no changes)",
      contentType: "text/plain",
    });
    expect(diff.stdout.trim(), "FRB regeneration changed tracked or added untracked files").toBe(
      "",
    );
  },
);

Given(
  "a scratch copy of the repository with one member crate removed from the workspace that another member depends on",
  async ({ scenario, $testInfo }) => {
    const tree = createScratchWorktree("vs9-remove-crate");
    scenario.cleanups.push(() => tree.remove());
    const metadata = runCommand("cargo metadata --no-deps --format-version 1", tree.dir);
    expect(metadata.exitCode, metadata.stderr).toBe(0);
    const parsed = JSON.parse(metadata.stdout) as {
      packages: Array<{
        name: string;
        manifest_path: string;
        dependencies: Array<{ name: string; path?: string }>;
      }>;
    };
    const names = new Set(parsed.packages.map((p) => p.name));
    const depended = parsed.packages.flatMap((p) =>
      p.dependencies.filter((d) => d.path !== undefined && names.has(d.name)).map((d) => d.name),
    );
    const victim = parsed.packages.find((p) => p.name === depended[0]);
    expect(victim, "a workspace member that another member depends on").toBeDefined();
    if (victim === undefined) return;
    rmSync(dirname(victim.manifest_path), { recursive: true, force: true });
    await $testInfo.attach("removed-crate.txt", {
      body: `${victim.name} (${victim.manifest_path})`,
      contentType: "text/plain",
    });
    scenario.scratchDir = tree.dir;
  },
);

When("{string} runs in the scratch copy", async ({ scenario, $testInfo }, command: string) => {
  await runAndRecord(scenario, (n, o) => $testInfo.attach(n, o), command, scenario.scratchDir);
  expect(lastRun(scenario).command).toBe(command);
});
