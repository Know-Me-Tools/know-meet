import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Locator, type Page } from "@playwright/test";
import { CAPTURE_ENVIRONMENT } from "../src/support/capture-environment.ts";
import { sha256 } from "../src/support/digests.ts";
import {
  baselineRelPath,
  findEntry,
  type Inventory,
  type Theme,
} from "../src/support/inventory.ts";
import { type FidelityOracle, loggedDefect, thresholdFor } from "../src/support/oracle.ts";
import { renderCell } from "../src/support/render-cell.ts";
import { BASELINES_DIR, FEATURES_DIR, repoPath } from "../src/support/repo-paths.ts";
import { runCommand, startServer } from "../src/support/run-command.ts";
import { createScratchWorktree, installScratch } from "../src/support/scratch-worktree.ts";
import { captureSubject, type RenderTarget } from "../src/support/state-drivers.ts";
import { Given, inScopeIdsOf, Then, When } from "./fixtures.ts";

const THEMES: readonly Theme[] = ["dark", "light"];
const VIEWPORTS: readonly number[] = [375, 768, 1024, 1440];
const SCRATCH_PREVIEW_PORT = 4174;

const snapshotName = (rel: string): string[] => rel.split("/");

/** Compares one rendered cell with its baseline; throws (hard) or records (soft). */
async function compareCell(
  subject: Page | Locator,
  fullPage: boolean,
  rel: string,
  oracle: FidelityOracle,
  stateId: string,
  soft: boolean,
): Promise<void> {
  const limits = thresholdFor(oracle, stateId);
  const options = {
    ...CAPTURE_ENVIRONMENT.screenshot,
    maxDiffPixelRatio: limits.maxDiffPixelRatio,
    threshold: limits.threshold,
    ...(fullPage ? { fullPage: true } : {}),
  };
  const assertion = soft ? expect.soft(subject) : expect(subject);
  await assertion.toHaveScreenshot(snapshotName(rel), options);
}

async function renderAndCompare(
  browser: Browser,
  target: RenderTarget,
  inventory: Inventory,
  oracle: FidelityOracle,
  stateId: string,
  soft: boolean,
  exceeded: string[],
): Promise<void> {
  const entry = findEntry(inventory, stateId);
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      const cell = await renderCell(browser, target, entry, theme, viewport);
      if (cell === null) continue;
      const rel = baselineRelPath(stateId, theme, viewport);
      try {
        expect.soft(cell.blocked, `external requests from ${rel}`).toEqual([]);
        const { subject, fullPage } = captureSubject(cell.page, target, cell.plan);
        const defect = loggedDefect(oracle, `${stateId}/${theme}/${viewport}`);
        expect
          .soft(defect, `design-lead logged a fidelity defect for ${rel} before the run`)
          .toBeUndefined();
        if (soft) await compareCell(subject, fullPage, rel, oracle, stateId, true);
        else {
          try {
            await compareCell(subject, fullPage, rel, oracle, stateId, false);
          } catch {
            exceeded.push(rel);
          }
        }
      } finally {
        await cell.context.close();
      }
    }
  }
}

Given("the frozen fidelity oracle {string}", async ({ oracle }, path: string) => {
  expect(path).toBe("tests/fidelity/oracle/thresholds.json");
  expect(oracle.status).toBe("frozen");
});

Given("the prototype baselines recorded in {string}", async ({ manifest }, path: string) => {
  expect(path).toBe("tests/fidelity/baselines/manifest.json");
  expect(manifest.schema).toBe("know-meet-baselines/v1");
  expect(manifest.counts.failed, "baseline capture failures").toBe(0);
});

Then(
  "every in-scope inventory state has a baseline for each theme and viewport or a recorded not-applicable reason",
  async ({ inventory, manifest }) => {
    const captured = new Set(
      manifest.baselines.map((b) => `${b.stateId}/${b.theme}/${b.viewport}`),
    );
    const notApplicable = new Set(
      manifest.skipped
        .filter((s) => s.disposition === "not-applicable")
        .map((s) => `${s.stateId}/${s.theme}/${s.viewport}`),
    );
    const missing = inScopeIdsOf(inventory)
      .flatMap((entry) =>
        THEMES.flatMap((theme) => VIEWPORTS.map((viewport) => `${entry.id}/${theme}/${viewport}`)),
      )
      .filter((cell) => !captured.has(cell) && !notApplicable.has(cell));
    expect(missing).toEqual([]);
  },
);

Then("every baseline image matches the sha256 recorded in the manifest", async ({ manifest }) => {
  const drifted = manifest.baselines
    .filter((b) => sha256(readFileSync(join(BASELINES_DIR, b.path))) !== b.sha256)
    .map((b) => b.path);
  expect(drifted).toEqual([]);
});

Then(
  "the states listed in this feature are exactly the in-scope inventory states",
  async ({ inventory }) => {
    const feature = readFileSync(join(FEATURES_DIR, "vs-1-web-fidelity.feature"), "utf8");
    const examples = feature.slice(feature.indexOf("Examples:"));
    const listed = [...examples.matchAll(/^\s*\|\s*([a-z0-9.-]+)\s*\|\s*$/gm)]
      .map((m) => m[1])
      .filter((id) => id !== "state");
    expect([...listed].sort()).toEqual(
      inScopeIdsOf(inventory)
        .map((e) => e.id)
        .sort(),
    );
  },
);

When(
  "the web app renders state {string} in each theme at each viewport",
  async ({ browser, appTarget, inventory, oracle, scenario }, stateId: string) => {
    scenario.exceededCells = [];
    await renderAndCompare(
      browser,
      appTarget,
      inventory,
      oracle,
      stateId,
      true,
      scenario.exceededCells,
    );
  },
);

Then(
  "every capture of {string} is within its frozen threshold of the prototype baseline",
  async ({ $testInfo }, stateId: string) => {
    const failures = $testInfo.errors.map((e) => e.message ?? "").filter((m) => m.length > 0);
    expect(failures, `soft comparison failures for ${stateId}`).toEqual([]);
  },
);

Given(
  "a scratch web build whose tokens.json is the pre-reconciliation version from commit {string}",
  async ({ scenario }, commit: string) => {
    const tree = createScratchWorktree("vs1-old-tokens");
    scenario.cleanups.push(() => tree.remove());
    const old = runCommand(`git show ${commit}:docs/design/tokens.json`);
    expect(old.exitCode, old.stderr).toBe(0);
    expect(sha256(old.stdout), "the control must use different tokens").not.toBe(
      sha256(readFileSync(repoPath("docs/design/tokens.json"))),
    );
    writeFileSync(join(tree.dir, "docs", "design", "tokens.json"), old.stdout);
    installScratch(tree.dir);
    for (const command of [
      "pnpm --filter @know-meet/design-tokens generate",
      "pnpm --filter @know-meet/web build",
    ]) {
      const run = runCommand(command, tree.dir);
      expect(run.exitCode, `${command}\n${run.stderr.slice(-3000)}`).toBe(0);
    }
    const url = `http://127.0.0.1:${SCRATCH_PREVIEW_PORT}`;
    const server = await startServer(
      `pnpm --filter @know-meet/web preview --host 127.0.0.1 --port ${SCRATCH_PREVIEW_PORT} --strictPort`,
      tree.dir,
      url,
    );
    scenario.cleanups.push(() => server.stop());
    scenario.scratchDir = tree.dir;
    scenario.scratchBaseUrl = url;
  },
);

When(
  "that build renders states {string}, {string} and {string} in each theme at each viewport",
  async ({ browser, appTarget, inventory, oracle, scenario }, a: string, b: string, c: string) => {
    const base = scenario.scratchBaseUrl ?? "";
    const scratchTarget: RenderTarget = {
      ...appTarget,
      urlFor: (entry) => {
        const url = new URL(appTarget.urlFor(entry));
        return `${base}${url.pathname}${url.search}${url.hash}`;
      },
    };
    scenario.exceededCells = [];
    for (const stateId of [a, b, c])
      await renderAndCompare(
        browser,
        scratchTarget,
        inventory,
        oracle,
        stateId,
        false,
        scenario.exceededCells,
      );
  },
);

Then("at least one capture exceeds its frozen threshold", async ({ scenario, $testInfo }) => {
  await $testInfo.attach("negative-control cells over threshold", {
    body: JSON.stringify(scenario.exceededCells ?? []),
    contentType: "application/json",
  });
  expect((scenario.exceededCells ?? []).length).toBeGreaterThan(0);
});

When(
  "the dark baseline of {string} at {int} is compared with its light baseline under the frozen threshold",
  async ({ oracle, scenario }, stateId: string, viewport: number) => {
    const dark = readFileSync(join(BASELINES_DIR, baselineRelPath(stateId, "dark", viewport)));
    const limits = thresholdFor(oracle, stateId);
    try {
      expect(dark).toMatchSnapshot(snapshotName(baselineRelPath(stateId, "light", viewport)), {
        maxDiffPixelRatio: limits.maxDiffPixelRatio,
        threshold: limits.threshold,
      });
      scenario.comparisonFailed = false;
    } catch {
      scenario.comparisonFailed = true;
    }
  },
);

Then("the comparison fails", async ({ scenario }) => {
  expect(scenario.comparisonFailed).toBe(true);
});
