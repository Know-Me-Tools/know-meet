/**
 * Know Meet value-scenario suite (playwright-bdd over root features/).
 * Boundary-only (VLBV): run once at c13, never per change. Projects:
 *   web - browser scenarios (VS-1, VS-5, accessibility, motion), Chromium gating
 *   cli - command scenarios (VS-2, VS-3, VS-4, VS-8, VS-9)
 * Baselines are compared, never written: updateSnapshots is "none".
 */
import { defineConfig, devices } from "@playwright/test";
import { cucumberReporter, defineBddConfig } from "playwright-bdd";

const PREVIEW_PORT = Number(process.env["KM_WEB_PREVIEW_PORT"] ?? "4173");
const BASE_URL = process.env["KM_WEB_BASE_URL"] ?? `http://127.0.0.1:${PREVIEW_PORT}`;
const EVIDENCE_DIR = process.env["KM_EVIDENCE_DIR"] ?? "reports";

const shared = { featuresRoot: "../../features", steps: ["steps/**/*.ts"] };

const webDir = defineBddConfig({
  ...shared,
  outputDir: ".features-gen/web",
  tags: "@ui and not @cli",
});

const cliDir = defineBddConfig({
  ...shared,
  outputDir: ".features-gen/cli",
  tags: "@cli",
});

export default defineConfig({
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30 * 60 * 1000,
  updateSnapshots: "none",
  snapshotDir: "./baselines",
  snapshotPathTemplate: "{snapshotDir}/{arg}{ext}",
  outputDir: `${EVIDENCE_DIR}/test-results`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${EVIDENCE_DIR}/html`, open: "never" }],
    ["json", { outputFile: `${EVIDENCE_DIR}/playwright.json` }],
    cucumberReporter("json", { outputFile: `${EVIDENCE_DIR}/cucumber.json` }),
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "web", testDir: webDir, use: { ...devices["Desktop Chrome"] } },
    { name: "cli", testDir: cliDir },
  ],
  // An external KM_WEB_BASE_URL means no local server; [] is "none" under exactOptionalPropertyTypes.
  webServer: process.env["KM_WEB_BASE_URL"]
    ? []
    : {
        command: `pnpm --filter @know-meet/web preview --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
        cwd: "../..",
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
