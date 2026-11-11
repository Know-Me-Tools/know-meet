/**
 * Harness check suite. Run against one prototype at a time:
 *   SPIKE_URL=http://localhost:4173/ SPIKE_NAME=hybrid pnpm check
 * The mock server is started (or reused) on KM_HARNESS_URL's port.
 * SPIKE_BROWSERS=chromium,webkit adds WebKit (Tauri on macOS uses WebKit).
 * CHECK_EVIDENCE=all records trace and video for every test (phase-close evidence).
 */
import { defineConfig, devices, type Project } from "@playwright/test";
import { HARNESS_URL, SPIKE_NAME } from "./checks/support/env.ts";

const harnessPort = new URL(HARNESS_URL).port || "80";
const evidenceAll = process.env["CHECK_EVIDENCE"] === "all";
const browsers = (process.env["SPIKE_BROWSERS"] ?? "chromium").split(",").map((b) => b.trim()).filter((b) => b !== "");

const DEVICE_FOR: Readonly<Record<string, string>> = { chromium: "Desktop Chrome", webkit: "Desktop Safari", firefox: "Desktop Firefox" };

const projects: Project[] = browsers.map((name) => {
  const device = DEVICE_FOR[name];
  if (device === undefined) throw new Error(`SPIKE_BROWSERS: unknown browser "${name}" (use chromium, webkit, firefox)`);
  return { name, use: { ...devices[device] } };
});

export default defineConfig({
  testDir: "./checks",
  testMatch: "**/*.spec.ts",
  outputDir: `./test-results/${SPIKE_NAME}`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: `./reports/checks-${SPIKE_NAME}.json` }],
    ["html", { outputFolder: `./reports/checks-${SPIKE_NAME}-html`, open: "never" }],
  ],
  use: {
    trace: evidenceAll ? "on" : "retain-on-failure",
    video: evidenceAll ? "on" : "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects,
  webServer: {
    command: "node src/server/main.ts",
    url: `${HARNESS_URL}/healthz`,
    env: { KM_HARNESS_PORT: harnessPort },
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
