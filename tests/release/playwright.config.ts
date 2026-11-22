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
 *
 * WC additions (web-conferencing-features, wc01 task 1.1): the WC-2, WC-3, WC-6 and WC-7
 * specs also run in Firefox and WebKit. Those tests carry @cross-engine; the
 * *-firefox and *-webkit projects select only that tag. Firefox and WebKit have
 * no fake-media flags, so cross-engine tests join with microphone and camera off.
 */
import { defineConfig, devices } from "@playwright/test";
import { AUTO_SELECT_SCREEN_ARGS, FAKE_MEDIA_ARGS } from "./src/browser-args.ts";

const PACKAGED_BASE_URL = process.env["KM_RELEASE_BASE_URL"] ?? "http://localhost:8080";
const HOSTED_BASE_URL = "https://meet.know-me.tools";

// Computed once in the runner process and exported, so worker processes (which
// re-evaluate this file) write into the same dated folder.
if (process.env["KM_EVIDENCE_DIR"] === undefined || process.env["KM_EVIDENCE_DIR"] === "") {
  process.env["KM_EVIDENCE_DIR"] = `reports/${new Date().toISOString().replace(/[:.]/g, "-")}`;
}
const EVIDENCE_DIR = process.env["KM_EVIDENCE_DIR"];

const chromiumWithFakeMedia = {
  ...devices["Desktop Chrome"],
  permissions: ["camera", "microphone"],
  launchOptions: { args: [...FAKE_MEDIA_ARGS, ...AUTO_SELECT_SCREEN_ARGS] },
};

function crossEngineProjects(prefix: string, baseURL: string) {
  const exclude = prefix === "packaged" ? /@hosted-only/ : /@packaged-only/;
  return [
    {
      name: `${prefix}-firefox`,
      grep: /@cross-engine/,
      grepInvert: exclude,
      use: {
        ...devices["Desktop Firefox"],
        baseURL,
        // Firefox has no fake-media flags; without these prefs the lobby's preview waits on a
        // permission prompt that never shows, and its controls stay disabled (hosted run
        // 2026-11-21, hosted-firefox--wc-3-chat-private).
        launchOptions: {
          firefoxUserPrefs: {
            "media.navigator.streams.fake": true,
            "media.navigator.permission.disabled": true,
          },
        },
      },
    },
    {
      name: `${prefix}-webkit`,
      grep: /@cross-engine/,
      grepInvert: exclude,
      use: { ...devices["Desktop Safari"], baseURL },
    },
  ];
}

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
      grepInvert: /@hosted-only|@gpu/,
      use: { ...chromiumWithFakeMedia, baseURL: PACKAGED_BASE_URL },
    },
    // Headed Chromium on the host GPU (web-conferencing-hardening HD-1): on a software GPU the
    // background effect engine freezes the page, so the Preparing path is observable only here.
    // Runs on the operator's Mac, not in CI.
    {
      name: "packaged-gpu",
      grep: /@gpu/,
      use: { ...chromiumWithFakeMedia, headless: false, baseURL: PACKAGED_BASE_URL },
    },
    {
      name: "hosted",
      grepInvert: /@packaged-only/,
      use: { ...chromiumWithFakeMedia, baseURL: HOSTED_BASE_URL },
    },
    ...crossEngineProjects("packaged", PACKAGED_BASE_URL),
    ...crossEngineProjects("hosted", HOSTED_BASE_URL),
  ],
});
