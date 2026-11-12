import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "@playwright/test";
import { installTauriTrap, tauriReads } from "../src/smoke/tauri-trap.ts";
import { runCommand, startServer } from "../src/support/run-command.ts";
import { createScratchWorktree, installScratch } from "../src/support/scratch-worktree.ts";
import { Given, Then, When } from "./fixtures.ts";

const SCRATCH_PREVIEW_PORT = 4175;
const NEGATIVE_CONTROL_LINE =
  "import { invoke } from '@tauri-apps/api/core';\nvoid invoke('km_negative_control_unguarded');\n";

interface SmokeObservation {
  readonly reads: readonly string[];
  readonly consoleErrors: readonly string[];
  readonly mainVisible: boolean;
  readonly appbarVisible: boolean;
  readonly bodyText: number;
}

const observations = new WeakMap<object, SmokeObservation>();

/** Finds the module entry the web index.html loads (Vite convention). */
function webEntry(root: string): string {
  const html = readFileSync(join(root, "apps", "web", "index.html"), "utf8");
  const match = /<script[^>]*type="module"[^>]*src="\/?([^"]+)"/.exec(html);
  if (match?.[1] === undefined) throw new Error("apps/web/index.html has no module entry script");
  return join(root, "apps", "web", match[1]);
}

Given(
  "a scratch branch whose web entry calls the Tauri invoke API at startup without an isTauri\\() guard",
  async ({ scenario }) => {
    const tree = createScratchWorktree("vs5-unguarded");
    scenario.cleanups.push(() => tree.remove());
    const entry = webEntry(tree.dir);
    writeFileSync(entry, NEGATIVE_CONTROL_LINE + readFileSync(entry, "utf8"));
    installScratch(tree.dir);
    const build = runCommand("pnpm --filter @know-meet/web build", tree.dir);
    expect(build.exitCode, build.stderr.slice(-3000)).toBe(0);
    scenario.scratchDir = tree.dir;
  },
);

Given("the scratch build is served by Vite preview", async ({ scenario }) => {
  const url = `http://127.0.0.1:${SCRATCH_PREVIEW_PORT}`;
  const server = await startServer(
    `pnpm --filter @know-meet/web preview --host 127.0.0.1 --port ${SCRATCH_PREVIEW_PORT} --strictPort`,
    scenario.scratchDir ?? "",
    url,
  );
  scenario.cleanups.push(() => server.stop());
  scenario.scratchBaseUrl = url;
});

When(
  "a browser without the Tauri runtime opens the home route",
  async ({ browser, baseURL, appStateMap, scenario, $testInfo }) => {
    const context = await browser.newContext();
    scenario.cleanups.push(() => context.close());
    await installTauriTrap(context);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
    const origin = scenario.scratchBaseUrl ?? baseURL ?? "";
    await page.goto(`${origin}/`);
    await page.waitForLoadState("networkidle");
    const observation: SmokeObservation = {
      reads: await tauriReads(page),
      consoleErrors,
      mainVisible: await page.locator(appStateMap.roles.main).first().isVisible(),
      appbarVisible: await page.locator(appStateMap.roles.appbar).first().isVisible(),
      // biome-ignore lint/performance/useDomNodeTextContent: this is Playwright's Locator API, not a DOM node; the smoke check wants rendered (visible) text.
      bodyText: (await page.locator("body").innerText()).trim().length,
    };
    observations.set(scenario, observation);
    await $testInfo.attach("console-log.json", {
      body: JSON.stringify(observation, null, 2),
      contentType: "application/json",
    });
    await $testInfo.attach("home.png", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  },
);

function observed(scenario: object): SmokeObservation {
  const value = observations.get(scenario);
  if (value === undefined) throw new Error("The home route was not opened in this scenario");
  return value;
}

Then("the home route's main landmark and app bar are visible", async ({ scenario }) => {
  const o = observed(scenario);
  expect(o.mainVisible, "main landmark").toBe(true);
  expect(o.appbarVisible, "app bar").toBe(true);
});

Then("no console error or uncaught page error was logged", async ({ scenario }) => {
  expect(observed(scenario).consoleErrors).toEqual([]);
});

Then("no code read the Tauri runtime globals", async ({ scenario }) => {
  expect(observed(scenario).reads).toEqual([]);
});

Then("the console log and a screenshot are recorded as evidence", async ({ $testInfo }) => {
  const names = $testInfo.attachments.map((a) => a.name);
  expect(names).toEqual(expect.arrayContaining(["console-log.json", "home.png"]));
});

Then(
  "the smoke reports a Tauri global read, a console error or a blank page",
  async ({ scenario }) => {
    const o = observed(scenario);
    const detected =
      o.reads.length > 0 || o.consoleErrors.length > 0 || !o.mainVisible || o.bodyText === 0;
    expect(detected, `negative control not detected: ${JSON.stringify(o)}`).toBe(true);
  },
);
