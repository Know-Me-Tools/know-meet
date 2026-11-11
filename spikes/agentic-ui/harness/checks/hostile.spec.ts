/**
 * Hostile markdown/media corpus. For every item: nothing executes (the
 * __kmXss sentinel is never called, no dialog, no navigation), no request
 * leaves the allowed origins (page network + evil-listener hits), no on*
 * attribute and no globally forbidden element renders in the transcript, the
 * raw text is preserved, and the item's own assertions hold.
 */
import { expect, test } from "@playwright/test";
import type { HostileItem } from "../src/domain/hostile.ts";
import { HOSTILE_MESSAGE_ID } from "../src/corpus-authoring/hostile/hostile-corpus.ts";
import { expectConformance } from "./support/conformance.ts";
import { hostileIds } from "./support/corpus-index.ts";
import { HARNESS_URL, spikeUrl } from "./support/env.ts";
import { harnessApi } from "./support/harness-api.ts";
import { eventHandlerAttributes, HostileGuards } from "./support/hostile-guards.ts";
import { PrototypePage } from "./support/prototype-page.ts";

const TRANSCRIPT = '[data-testid="km-transcript"]';

async function selectorProblems(p: PrototypePage, item: HostileItem, globalForbidden: readonly string[]): Promise<string[]> {
  const problems: string[] = [];
  for (const selector of [...globalForbidden, ...(item.assert.forbiddenSelectors ?? [])]) {
    const count = await p.transcript.locator(selector).count();
    if (count > 0) problems.push(`forbidden ${selector} matched ${count}`);
  }
  for (const req of item.assert.requiredSelectors ?? []) {
    const count = await p.transcript.locator(req.selector).count();
    if (req.count !== undefined && count !== req.count) problems.push(`required ${req.selector}: expected ${req.count}, found ${count}`);
    if (req.minCount !== undefined && count < req.minCount) problems.push(`required ${req.selector}: expected at least ${req.minCount}, found ${count}`);
  }
  const text = await p.transcript.innerText();
  for (const t of item.assert.mustShowText ?? []) if (!text.includes(t)) problems.push(`text not shown: ${JSON.stringify(t)}`);
  return problems;
}

/** ms from the first visible assistant text to status "complete". */
async function finalizeTime(p: PrototypePage): Promise<number> {
  await p.waitForAssistantText(1);
  const start = Date.now();
  await p.page.waitForFunction(
    (id: string) => window.__spike?.snapshot().messages.some((m) => m.id === id && m.status !== "streaming") === true,
    HOSTILE_MESSAGE_ID,
    { polling: 50, timeout: 30_000 },
  );
  return Date.now() - start;
}

async function longTaskTotal(p: PrototypePage): Promise<number | null> {
  return p.page.evaluate(() => {
    const km = window.__km;
    if (km === undefined || !km.longTaskSupported) return null;
    const since = km.marks["submit"] ?? 0;
    return km.longTasks.filter((t) => t.start >= since).reduce((sum, t) => sum + t.duration, 0);
  });
}

test.describe("hostile markdown and media corpus", () => {
  for (const { id, category } of hostileIds()) {
    test(`hostile/${id} @hostile @${category}`, async ({ page }) => {
      const scenarioId = `hostile/${id}`;
      const [scenario, corpus] = await Promise.all([harnessApi.scenario(scenarioId), harnessApi.hostile()]);
      const item = corpus.items.find((i) => i.id === id);
      if (item === undefined) throw new Error(`hostile item ${id} missing from GET /hostile`);
      const startedAt = Date.now();
      const guards = new HostileGuards(page, [spikeUrl().origin, new URL(HARNESS_URL).origin]);
      const p = await PrototypePage.open(page, scenarioId);
      guards.arm();
      test.info().annotations.push({ type: "session", description: p.sessionId }, { type: "expected-outcome", description: item.expectedOutcome });

      await p.submitPrompt(scenario.userPrompt);
      const finalizeMs = await finalizeTime(p);
      await p.waitForSettled();
      await expectConformance(p, scenario.expected, scenarioId);
      await page.waitForLoadState("networkidle");

      const xss = await page.evaluate(() => window.__km?.xssCalls ?? ["<instrumentation missing>"]);
      const hits = await harnessApi.hits(startedAt);
      const report = guards.report();
      expect.soft(xss, "__kmXss sentinel calls (script executed)").toEqual([]);
      expect.soft(report.dialogs, "dialogs opened").toEqual([]);
      expect.soft(report.navigations, "main-frame navigations").toEqual([]);
      expect.soft(report.disallowedRequests, "requests to disallowed origins").toEqual([]);
      expect.soft(hits.evil.map((h) => `${h.method} ${h.path}`), "evil listener hits").toEqual([]);
      expect.soft(await eventHandlerAttributes(page, TRANSCRIPT), "on* attributes in the transcript").toEqual([]);
      expect.soft(await selectorProblems(p, item, corpus.globalForbiddenSelectors), "selector and text assertions").toEqual([]);

      const minMedia = item.assert.allowedMediaRequestsMin;
      if (minMedia !== undefined) expect.soft(hits.allowedMedia.length, "allowed media requests").toBeGreaterThanOrEqual(minMedia);
      if (item.assert.finalizeWithinMs !== undefined) expect.soft(finalizeMs, "first text to complete (ms)").toBeLessThanOrEqual(item.assert.finalizeWithinMs);
      const maxLong = item.assert.maxLongTaskMs;
      if (maxLong !== undefined) {
        const total = await longTaskTotal(p);
        if (total === null) test.info().annotations.push({ type: "not-measured", description: "long tasks unsupported in this browser" });
        else expect.soft(total, "summed long-task time (ms)").toBeLessThanOrEqual(maxLong);
      }
    });
  }
});
