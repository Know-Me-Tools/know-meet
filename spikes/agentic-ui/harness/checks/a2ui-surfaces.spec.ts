/**
 * A2UI golden surfaces delivered over AG-UI (ACTIVITY_SNAPSHOT, activityType
 * "a2ui-surface", content.a2ui_operations). Per surface: rendered/fallback
 * component ids, visible text, final data model, blocked media URLs, then each
 * golden interaction and the A2UI action it must (or must not) send back.
 */
import { expect, test, type Request } from "@playwright/test";
import type { GoldenInteraction, GoldenSurfaceFile } from "../src/domain/a2ui-surface.ts";
import { deepEqual, short } from "./support/deep-equal.ts";
import { expectConformance } from "./support/conformance.ts";
import { surfaceIds } from "./support/corpus-index.ts";
import { harnessApi } from "./support/harness-api.ts";
import { a2uiComponent, fillA2ui, toggleA2ui } from "./support/interactions.ts";
import { PrototypePage } from "./support/prototype-page.ts";

async function actionCount(p: PrototypePage): Promise<number> {
  return (await harnessApi.session(p.sessionId))?.summary.a2uiActions.length ?? 0;
}

async function runInteraction(p: PrototypePage, surface: GoldenSurfaceFile, interaction: GoldenInteraction): Promise<void> {
  const before = await actionCount(p);
  if (interaction.fill !== undefined) await fillA2ui(p, surface.surfaceId, interaction.fill);
  if (interaction.toggle !== undefined) await toggleA2ui(p, surface.surfaceId, interaction.toggle);
  await a2uiComponent(p, surface.surfaceId, interaction.click).click();
  for (const text of interaction.expectVisibleText ?? []) {
    await expect(p.transcript.getByText(text, { exact: false }).first(), `"${interaction.description}" shows ${text}`).toBeVisible();
  }
  const wanted = interaction.expectAction;
  if (wanted === undefined) {
    await p.page.waitForLoadState("networkidle");
    expect(await actionCount(p), `"${interaction.description}" must not send an A2UI action`).toBe(before);
    return;
  }
  await expect.poll(() => actionCount(p), { message: `"${interaction.description}" sends action ${wanted.name}` }).toBeGreaterThan(before);
  const actions = (await harnessApi.session(p.sessionId))?.summary.a2uiActions ?? [];
  const sent = actions[before];
  expect(sent?.name, "action name").toBe(wanted.name);
  expect(sent?.surfaceId, "action surfaceId").toBe(surface.surfaceId);
  if (sent?.sourceComponentId !== undefined) expect(sent.sourceComponentId, "action sourceComponentId").toBe(wanted.sourceComponentId);
  expect(deepEqual(sent?.context ?? {}, wanted.context), `action context: expected ${short(wanted.context)}, got ${short(sent?.context)}`).toBe(true);
  await p.waitForServerIdle();
  await p.waitForSettled();
}

test.describe("A2UI golden surfaces over AG-UI", () => {
  for (const surfaceId of surfaceIds()) {
    test(`a2ui/${surfaceId} @a2ui`, async ({ page }) => {
      const scenarioId = `a2ui/${surfaceId}`;
      const [scenario, surface] = await Promise.all([harnessApi.scenario(scenarioId), harnessApi.surface(surfaceId)]);
      const requested: string[] = [];
      page.on("request", (r: Request) => requested.push(r.url()));
      const p = await PrototypePage.open(page, scenarioId);
      test.info().annotations.push({ type: "session", description: p.sessionId });
      await p.submitPrompt(scenario.userPrompt);
      await p.waitForSettled();
      await expectConformance(p, scenario.expected, scenarioId);

      for (const text of surface.expected.visibleText) {
        await expect(p.transcript.getByText(text, { exact: false }).first(), `visible text ${text}`).toBeVisible();
      }
      if (surface.expected.dataModel !== undefined) {
        const snap = await p.snapshot();
        const model = snap.a2uiSurfaces.find((s) => s.surfaceId === surface.surfaceId)?.dataModel;
        expect(deepEqual(model, surface.expected.dataModel), `dataModel: expected ${short(surface.expected.dataModel)}, got ${short(model)}`).toBe(true);
      }
      await page.waitForLoadState("networkidle");
      const blocked = requested.filter((url) => surface.expected.blockedMediaUrls.includes(url));
      expect(blocked, "disallowed media URLs must never be requested").toEqual([]);

      for (const interaction of surface.interactions) await runInteraction(p, surface, interaction);
    });
  }
});
