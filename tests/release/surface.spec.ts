/**
 * WR-5 Screens on sample data are not reachable in the hosted build
 * (features/wr-5-hosted-surface.feature).
 * - Positive scenario: both projects, against the hosted build at baseURL.
 * - Negative control: packaged project only (@packaged-only). The same checks
 *   against the default build of the same commit must report that /dashboard
 *   renders. The default build is served at KM_RELEASE_DEFAULT_BUILD_URL.
 */
import { expect, test } from "@playwright/test";
import { attachJson } from "./src/evidence.ts";
import { defaultBuildUrl } from "./src/release-env.ts";
import { surfaceProblems } from "./src/surface-checks.ts";

const SURFACE_TIMEOUT_MS = 3 * 60 * 1000;

test.describe("WR-5 Screens on sample data are not reachable in the hosted build", () => {
  test(
    "only home, join and the meeting room are reachable",
    { tag: ["@WR-5", "@value-critical"] },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(SURFACE_TIMEOUT_MS);
      const report = await surfaceProblems(browser, baseURL ?? "");
      await attachJson(testInfo, "wr-5-surface.json", { baseURL, ...report });
      expect(report.problems, "hosted surface problems").toEqual([]);
    },
  );

  test(
    "the same checks fail on the default build because /dashboard renders",
    { tag: ["@WR-5", "@negative-control", "@packaged-only"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(SURFACE_TIMEOUT_MS);
      const target = defaultBuildUrl();
      const report = await surfaceProblems(browser, target);
      await attachJson(testInfo, "wr-5-negative.json", { target, ...report });
      // The default build must really be served, or the control proves nothing.
      expect(
        report.problems.filter((p) => p.endsWith("did not render")),
        "the default build renders the three screens",
      ).toEqual([]);
      expect(
        report.problems,
        "the default build is detected by the same checks",
      ).toContain("/dashboard: does not render the not-found state");
    },
  );
});
