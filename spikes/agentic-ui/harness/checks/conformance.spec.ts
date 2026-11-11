/**
 * AG-UI conformance: every golden scenario, driven through the prototype's UI,
 * must end in the state its `expected` block describes (src/domain/expected.ts).
 */
import { test } from "@playwright/test";
import { agUiScenarios } from "./support/corpus-index.ts";
import { expectConformance } from "./support/conformance.ts";
import { harnessApi } from "./support/harness-api.ts";
import { driveScenario } from "./support/interactions.ts";
import { PrototypePage } from "./support/prototype-page.ts";

test.describe("AG-UI golden corpus conformance", () => {
  for (const { id, tags } of agUiScenarios()) {
    test(`${id} ${tags.join(" ")}`, async ({ page }) => {
      const scenario = await harnessApi.scenario(id);
      const p = await PrototypePage.open(page, id);
      test.info().annotations.push({ type: "session", description: p.sessionId });
      await driveScenario(p, scenario.userPrompt, scenario.interactions);
      await expectConformance(p, scenario.expected, id);
    });
  }
});
