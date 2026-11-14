import { spawn } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { simulateTauriRuntime } from "../src/smoke/tauri-trap.ts";
import { listFiles } from "../src/support/digests.ts";
import { REPO_ROOT, repoPath } from "../src/support/repo-paths.ts";
import { runCommand } from "../src/support/run-command.ts";
import { scratchTempDir } from "../src/support/scratch-worktree.ts";
import { lastRun, runAndRecord } from "./common.steps.ts";
import { Given, Then, When } from "./fixtures.ts";

const CHECKER = "node tests/fidelity/src/bundle-identity/check-bundle-identity.ts";
const WINDOW_TIMEOUT_MS = 30_000;

Given(
  "the web bundle has been built once into {string}",
  async ({ scenario, $testInfo }, dist: string) => {
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      "pnpm --filter @know-meet/web build",
    );
    expect(lastRun(scenario).exitCode).toBe(0);
    expect(listFiles(repoPath(dist)).length).toBeGreaterThan(0);
  },
);

When(
  "the desktop debug build is produced with {string}",
  async ({ scenario, $testInfo }, command: string) => {
    await runAndRecord(scenario, (n, o) => $testInfo.attach(n, o), command);
  },
);

// biome-ignore lint/correctness/noEmptyPattern: Playwright reads the first parameter of a fixture or step and requires an object-destructuring pattern, even when no fixture is used.
Then("frontendDist in {string} resolves to {string}", async ({}, conf: string, dist: string) => {
  const parsed = JSON.parse(readFileSync(repoPath(conf), "utf8")) as {
    build?: { frontendDist?: string };
  };
  const frontendDist = parsed.build?.frontendDist ?? "";
  const resolved = join(repoPath(conf), "..", frontendDist);
  expect(existsSync(resolved), `frontendDist ${frontendDist}`).toBe(true);
  expect(runCommand(`realpath "${resolved}"`).stdout.trim()).toBe(
    runCommand(`realpath "${repoPath(dist)}"`).stdout.trim(),
  );
});

Then(
  "the bundle-identity check reports the same content digest for frontendDist and {string}",
  async ({ scenario, $testInfo }, dist: string) => {
    await runAndRecord(scenario, (n, o) => $testInfo.attach(n, o), `${CHECKER} --web ${dist}`);
    const run = lastRun(scenario);
    expect(run.exitCode, run.stderr).toBe(0);
    const receipt = JSON.parse(run.stdout) as {
      left: { digest: string };
      right: { digest: string };
      identical: boolean;
    };
    expect(receipt.identical).toBe(true);
    expect(receipt.left.digest).toBe(receipt.right.digest);
  },
);

Then("the digest pair is recorded as evidence", async ({ scenario, $testInfo }) => {
  await $testInfo.attach("vs-2-digest-pair.json", {
    body: lastRun(scenario).stdout,
    contentType: "application/json",
  });
});

Given("the desktop debug build exists", async () => {
  const bundle = runCommand(
    "ls -d target/debug/bundle/macos/*.app apps/desktop/src-tauri/target/debug/bundle/macos/*.app 2>/dev/null | head -1",
  );
  expect(bundle.stdout.trim(), "debug .app bundle from `tauri build --debug`").not.toBe("");
});

When("the desktop app is launched", async ({ scenario, $testInfo }) => {
  const app = runCommand(
    "ls -d target/debug/bundle/macos/*.app apps/desktop/src-tauri/target/debug/bundle/macos/*.app 2>/dev/null | head -1",
  ).stdout.trim();
  const binary = runCommand(`ls "${join(REPO_ROOT, app)}/Contents/MacOS/" | head -1`).stdout.trim();
  const child = spawn(join(REPO_ROOT, app, "Contents", "MacOS", binary), [], { stdio: "ignore" });
  scenario.cleanups.push(() => {
    child.kill("SIGTERM");
  });
  const pid = child.pid ?? -1;
  const deadline = Date.now() + WINDOW_TIMEOUT_MS;
  let windows = 0;
  while (Date.now() < deadline && windows === 0) {
    const count = runCommand(
      `osascript -e 'tell application "System Events" to count windows of (first process whose unix id is ${pid})'`,
    );
    windows = Number.parseInt(count.stdout.trim(), 10) || 0;
    if (windows === 0) await new Promise((done) => setTimeout(done, 1000));
  }
  const shot = join($testInfo.outputDir, "desktop-launch.png");
  runCommand(`screencapture -x "${shot}"`);
  scenario.lastRun = {
    command: `launch ${app}`,
    cwd: REPO_ROOT,
    exitCode: windows > 0 ? 0 : 1,
    stdout: `windows=${windows}`,
    stderr: "",
    startedAt: new Date().toISOString(),
    durationMs: 0,
  };
  if (existsSync(shot))
    await $testInfo.attach("desktop-launch.png", { path: shot, contentType: "image/png" });
});

Then(
  "a native Know Meet window is open within 30 seconds and its screenshot is recorded",
  async ({ scenario, $testInfo }) => {
    expect(
      lastRun(scenario).exitCode,
      `${lastRun(scenario).stdout} (System Events access is required; missing access is BLOCKED, not FAIL)`,
    ).toBe(0);
    expect($testInfo.attachments.some((a) => a.name === "desktop-launch.png")).toBe(true);
  },
);

Then(
  "the web bundle, rendered with the Tauri runtime present, shows the home route with the custom titlebar",
  async ({ browser, baseURL, appStateMap, $testInfo }) => {
    const context = await browser.newContext();
    try {
      await simulateTauriRuntime(context);
      const page = await context.newPage();
      await page.goto(`${baseURL ?? ""}/`);
      await expect(page.locator(appStateMap.roles.titlebar).first()).toBeVisible();
      await expect(page.locator(appStateMap.roles.main).first()).toBeVisible();
      await $testInfo.attach("titlebar-home.png", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    } finally {
      await context.close();
    }
  },
);

Given(
  "a scratch copy of {string} with one byte changed in one file",
  async ({ scenario }, dist: string) => {
    const scratch = scratchTempDir("vs2-dist");
    scenario.cleanups.push(() => scratch.remove());
    cpSync(repoPath(dist), scratch.dir, { recursive: true });
    const victim =
      listFiles(scratch.dir).find((path) => path.endsWith(".html")) ?? listFiles(scratch.dir)[0];
    if (victim === undefined) throw new Error(`${dist} is empty`);
    const bytes = readFileSync(join(scratch.dir, victim));
    bytes[0] = (bytes[0] ?? 0) ^ 0x01;
    writeFileSync(join(scratch.dir, victim), bytes);
    scenario.scratchDir = scratch.dir;
    scenario.pageUrl = victim;
  },
);

When(
  "the bundle-identity check compares the scratch copy with {string}",
  async ({ scenario, $testInfo }, dist: string) => {
    await runAndRecord(
      scenario,
      (n, o) => $testInfo.attach(n, o),
      `${CHECKER} --compare "${scenario.scratchDir ?? ""}" ${dist}`,
    );
  },
);

Then("the check exits non-zero", async ({ scenario }) => {
  expect(lastRun(scenario).exitCode).toBe(1);
});

Then("it names the changed file in its output", async ({ scenario }) => {
  expect(lastRun(scenario).stderr).toContain(`content differs: ${scenario.pageUrl ?? "?"}`);
});
