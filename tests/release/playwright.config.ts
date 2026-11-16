/**
 * Know Meet web-release scenarios (WR-1 to WR-5, WR-8 automated part).
 * Boundary-only (VLBV): run once in wr09, never per change. Plain Playwright
 * specs, not playwright-bdd; features/wr-*.feature name the spec that runs them.
 *
 * Projects:
 *   packaged - the built images behind the local compose stack (KM_RELEASE_BASE_URL)
 *   hosted   - https://meet.know-me.tools
 * Tag routing: @hosted-only never runs in packaged; @packaged-only never runs in hosted.
 *
 * Invocation (from the repository root):
 *   pnpm --filter @know-meet/release-tests exec playwright test --project=packaged
 *   pnpm --filter @know-meet/release-tests exec playwright test --project=hosted
 * Evidence goes to KM_EVIDENCE_DIR (a new dated folder per run if unset).
 */
import { defineConfig, devices } from "@playwright/test";

const PACKAGED_BASE_URL = process.env["KM_RELEASE_BASE_URL"] ?? "http://localhost:8080";
const HOSTED_BASE_URL = "https://meet.know-me.tools";

// Computed once in the runner process and exported, so worker processes (which
// re-evaluate this file) write into the same dated folder.
if (process.env["KM_EVIDENCE_DIR"] === undefined || process.env["KM_EVIDENCE_DIR"] === "") {
  process.env["KM_EVIDENCE_DIR"] = `reports/${new Date().toISOString().replace(/[:.]/g, "-")}`;
}
const EVIDENCE_DIR = process.env["KM_EVIDENCE_DIR"];

/** Chromium fake camera and microphone; the fake UI flag auto-accepts the prompt. */
const FAKE_MEDIA_ARGS = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"];

const chromiumWithFakeMedia = {
  ...devices["Desktop Chrome"],
  permissions: ["camera", "microphone"],
  launchOptions: { args: FAKE_MEDIA_ARGS },
};

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 2 * 60 * 1000,
  expect: { timeout: 15_000 },
  outputDir: `${EVIDENCE_DIR}/test-results`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${EVIDENCE_DIR}/html`, open: "never" }],
    ["json", { outputFile: `${EVIDENCE_DIR}/playwright.json` }],
  ],
  use: {
    trace: "on",
    video: "on",
    screenshot: "on",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "packaged",
      grepInvert: /@hosted-only/,
      use: { ...chromiumWithFakeMedia, baseURL: PACKAGED_BASE_URL },
    },
    {
      name: "hosted",
      grepInvert: /@packaged-only/,
      use: { ...chromiumWithFakeMedia, baseURL: HOSTED_BASE_URL },
    },
  ],
});
