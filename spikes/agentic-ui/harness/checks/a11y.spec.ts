/**
 * Streaming accessibility (adversarial-review gate R9): axe in idle, streaming,
 * settled and approval states; aria-busy while streaming; the streaming text is
 * not itself a live region; live-region announcements are throttled and end
 * with a finalized announcement; focus is never stolen; approvals work from the
 * keyboard; run errors use role="alert".
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { harnessApi } from "./support/harness-api.ts";
import { PrototypePage } from "./support/prototype-page.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
/** At most one announcement per second of streaming, plus start/finish slack. */
const ANNOUNCEMENTS_PER_SECOND = 1;
const ANNOUNCEMENT_SLACK = 3;
const MAX_ANNOUNCEMENT_CHARS = 300;
const LIVE_ROLES = new Set(["log", "status", "alert", "marquee", "timer"]);

async function axeViolations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return result.violations.map((v) => `${v.id} (${v.impact ?? "n/a"}): ${v.nodes.length} node(s) — ${v.help}`);
}

async function openScenario(page: Page, id: string): Promise<{ p: PrototypePage; prompt: string }> {
  const scenario = await harnessApi.scenario(id);
  const p = await PrototypePage.open(page, id);
  test.info().annotations.push({ type: "session", description: p.sessionId });
  return { p, prompt: scenario.userPrompt };
}

test.describe("streaming accessibility", () => {
  test("axe finds no WCAG 2.2 A/AA violations idle, mid-stream and settled @a11y", async ({ page }) => {
    const { p, prompt } = await openScenario(page, "long-markdown");
    expect.soft(await axeViolations(page), "idle").toEqual([]);
    await p.submitPrompt(prompt);
    await p.waitForAssistantText(2_000);
    expect.soft(await axeViolations(page), "mid-stream").toEqual([]);
    await p.waitForSettled();
    expect.soft(await axeViolations(page), "settled").toEqual([]);
  });

  test("transcript is aria-busy while streaming and not after @a11y", async ({ page }) => {
    const { p, prompt } = await openScenario(page, "long-markdown");
    await p.submitPrompt(prompt);
    await p.waitForAssistantText(200);
    await expect(p.transcript, "aria-busy during the stream").toHaveAttribute("aria-busy", "true");
    await p.waitForSettled();
    await expect(p.transcript, "aria-busy cleared after the stream").not.toHaveAttribute("aria-busy", "true");
  });

  test("streaming text is not inside a live region @a11y", async ({ page }) => {
    const { p, prompt } = await openScenario(page, "long-markdown");
    await p.submitPrompt(prompt);
    await p.waitForAssistantText(200);
    const liveAncestors = await page.evaluate((liveRoles: readonly string[]) => {
      const streaming = document.querySelector('[data-testid="km-message"][data-status="streaming"]');
      if (streaming === null) return ["<no [data-testid=km-message][data-status=streaming] element>"];
      const found: string[] = [];
      for (let el: Element | null = streaming; el !== null; el = el.parentElement) {
        const live = el.getAttribute("aria-live");
        const role = el.getAttribute("role");
        if ((live !== null && live !== "off") || (role !== null && liveRoles.includes(role))) {
          found.push(`${el.tagName.toLowerCase()}[aria-live=${live ?? ""}][role=${role ?? ""}]`);
        }
      }
      return found;
    }, [...LIVE_ROLES]);
    expect(liveAncestors, "per-token text must not be announced").toEqual([]);
  });

  test("live-region announcements are throttled and finalized @a11y", async ({ page }) => {
    const { p, prompt } = await openScenario(page, "long-markdown");
    const region = page.getByTestId("km-live-region");
    await expect(region, "a single live region exists").toHaveCount(1);
    const live = (await region.getAttribute("aria-live")) ?? "";
    const role = (await region.getAttribute("role")) ?? "";
    expect(live === "polite" || live === "assertive" || role === "status" || role === "log", `live region semantics (aria-live=${live}, role=${role})`).toBe(true);

    await p.submitPrompt(prompt);
    await p.waitForAssistantText(1);
    const streamStart = await page.evaluate(() => performance.now());
    await p.waitForSettled();
    const streamEnd = await page.evaluate(() => performance.now());
    await expect.poll(() => page.evaluate(() => (window.__km?.live ?? []).at(-1)?.t ?? 0), { message: "a finalized announcement after completion" }).toBeGreaterThanOrEqual(streamEnd - 250);

    const announcements = await page.evaluate(() => (window.__km?.live ?? []).filter((r) => r.text !== ""));
    const during = announcements.filter((a) => a.t >= streamStart && a.t < streamEnd);
    const seconds = (streamEnd - streamStart) / 1000;
    expect(during.length, `announcements during a ${seconds.toFixed(1)} s stream`).toBeLessThanOrEqual(Math.ceil(seconds * ANNOUNCEMENTS_PER_SECOND) + ANNOUNCEMENT_SLACK);
    const final = announcements.at(-1);
    expect(final?.text ?? "", "final announcement is non-empty").not.toBe("");
    expect((final?.text ?? "").length, "final announcement is a summary, not the whole message").toBeLessThanOrEqual(MAX_ANNOUNCEMENT_CHARS);
  });

  test("streaming and approval requests never steal focus @a11y @keyboard", async ({ page }) => {
    const { p, prompt } = await openScenario(page, "hitl-approve");
    await p.submitPrompt(prompt);
    await p.composerInput.focus();
    const focusedAt = await page.evaluate(() => performance.now());
    await p.waitForSettled();
    await expect(p.approval("int-email-approve")).toHaveAttribute("data-status", "pending");
    expect(await p.activeTestId(), "focus stays in the composer").toBe("km-composer-input");
    const moves = await page.evaluate((since: number) => (window.__km?.focus ?? []).filter((f) => f.t > since && f.testid !== "km-composer-input"), focusedAt);
    expect(moves, "focus moves made by the app").toEqual([]);
    expect.soft(await axeViolations(page), "axe with a pending approval").toEqual([]);
  });

  for (const decision of ["approve", "reject"] as const) {
    test(`approval can be ${decision}d from the keyboard @a11y @keyboard`, async ({ page }) => {
      const scenarioId = decision === "approve" ? "hitl-approve" : "hitl-reject";
      const interruptId = decision === "approve" ? "int-email-approve" : "int-email-reject";
      const { p, prompt } = await openScenario(page, scenarioId);
      await p.submitPrompt(prompt);
      await p.waitForSettled();
      const card = p.approval(interruptId);
      await expect(card.getByRole("button", { name: /approve/i }), "approve button has an accessible name").toHaveCount(1);
      await expect(card.getByRole("button", { name: /reject|deny|decline/i }), "reject button has an accessible name").toHaveCount(1);
      const button = card.getByTestId(decision === "approve" ? "km-approval-approve" : "km-approval-reject");
      const before = await p.requestCount();
      await p.composerInput.focus();
      await p.tabTo(button);
      await page.keyboard.press(decision === "approve" ? "Enter" : "Space");
      await p.waitForRequestsAbove(before);
      await expect(card).toHaveAttribute("data-status", decision === "approve" ? "approved" : "rejected");
      const active = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? "none");
      expect(active, "focus is not dropped to <body> after the decision").not.toBe("body");
    });
  }

  test("run errors are announced with role=alert @a11y", async ({ page }) => {
    const { p, prompt } = await openScenario(page, "run-error");
    await p.submitPrompt(prompt);
    await p.waitForSettled();
    const alert = p.transcript.getByRole("alert");
    await expect(alert.first()).toBeVisible();
    expect((await alert.first().innerText()).trim().length, "alert has text").toBeGreaterThan(0);
  });
});
