/**
 * HD-5 (web-conferencing-hardening): the "Saving this meeting…" line after Leave passes axe and
 * is a polite status. The line shows only while the history writes finish, so the audit must run
 * inside that window.
 *
 * Repair 1: in the B4 run a full-page AxeBuilder scan (which injects axe-core each call) outlasted
 * the save, under CPU throttling as well, because throttling slows the scan as much as the save.
 * Now axe-core is injected once before Leave (a DevTools string, so the page CSP does not apply),
 * CPU throttling only helps the line appear, and the scan runs at full speed on the end view
 * (<main>) the moment the line is visible. Visibility is asserted before and after the scan.
 *
 * Amendment 3: up to three attempts, each in a fresh room, only for the line being gone before
 * the scan finished. A violation or wrong semantics in any attempt is final.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, type Page } from "@playwright/test";
import { WCAG_TAGS } from "./a11y-probes.ts";
import { ROOM } from "./test-ids.ts";
import type { AxeViolation } from "./wc-a11y-surfaces.ts";
import { firstVisibleAt, watchFirstVisible } from "./wh-observer.ts";

export const SAVING_TEST_ID = "km-room-end-saving";
const THROTTLE_RATE = 20;
const SAVING_WAIT_MS = 20_000;
export const SAVING_ATTEMPTS = 3;

/** axe-core from @axe-core/playwright's own dependency (pnpm keeps it out of this package). */
function axeSource(): string {
  const fromPlaywrightAxe = createRequire(
    createRequire(import.meta.url).resolve("@axe-core/playwright"),
  );
  return readFileSync(fromPlaywrightAxe.resolve("axe-core/axe.min.js"), "utf8");
}

export interface SavingAudit {
  readonly seenAt: number | null;
  readonly role: string | null;
  readonly live: string | null;
  readonly text: string;
  readonly visibleBeforeAudit: boolean;
  readonly visibleAfterAudit: boolean;
  readonly auditMs: number;
  readonly violations: AxeViolation[];
}

async function scanEndView(page: Page): Promise<{ violations: AxeViolation[]; ms: number }> {
  return page.evaluate(async (tags) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ctx: Element | Document,
            opts: object,
          ) => Promise<{
            violations: Array<{
              id: string;
              impact?: string | null;
              help: string;
              nodes: Array<{ target: unknown[]; html: string; failureSummary?: string }>;
            }>;
          }>;
        };
      }
    ).axe;
    const started = performance.now();
    const report = await axe.run(document.querySelector("main") ?? document, {
      runOnly: { type: "tag", values: tags },
    });
    return {
      ms: Math.round(performance.now() - started),
      violations: report.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? "unknown",
        help: v.help,
        nodes: v.nodes.map((n) => ({
          target: n.target.map(String).join(" "),
          html: n.html.slice(0, 200),
          summary: (n.failureSummary ?? "").slice(0, 300),
        })),
      })),
    };
  }, WCAG_TAGS);
}

/**
 * Leaves the room and audits the end view while the saving line shows. Throws BLOCKED when the
 * line never appeared, rather than auditing the wrong state.
 */
export async function auditSavingLine(page: Page): Promise<SavingAudit> {
  await page.evaluate(axeSource());
  const cdp = await page.context().newCDPSession(page);
  await watchFirstVisible(page, "saving", `[data-testid="${SAVING_TEST_ID}"]`);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE_RATE });
  try {
    await page.getByTestId(ROOM.leave).click();
    const confirm = page.getByTestId(ROOM.leaveConfirm);
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
    const line = page.getByTestId(SAVING_TEST_ID);
    const shown = await line.waitFor({ state: "visible", timeout: SAVING_WAIT_MS }).then(
      () => true,
      () => false,
    );
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const seenAt = await firstVisibleAt(page, "saving");
    if (!shown && seenAt === null)
      throw new Error("BLOCKED: the saving line never showed; nothing to audit");
    // Read at once, without waiting: the line may already be gone.
    const now = await page.evaluate((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el === null || el.getBoundingClientRect().height === 0) return null;
      return {
        role: el.getAttribute("role"),
        live: el.getAttribute("aria-live"),
        text: (el.textContent ?? "").trim(),
      };
    }, SAVING_TEST_ID);
    const { violations, ms } = await scanEndView(page);
    return {
      seenAt,
      role: now?.role ?? null,
      live: now?.live ?? null,
      text: now?.text ?? "",
      visibleBeforeAudit: now !== null,
      visibleAfterAudit: await line.isVisible(),
      auditMs: ms,
      violations,
    };
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => undefined);
  }
}

/**
 * Fails on any violation or wrong semantics, whether or not the line outlasted the scan. Returns
 * whether it did; only when it did not may the caller try again.
 */
export function savingAuditIsComplete(audit: SavingAudit): boolean {
  expect(audit.violations, "axe violations on the end view while saving").toEqual([]);
  if (audit.visibleBeforeAudit) {
    expect(audit.role, "the saving line is a status").toBe("status");
    expect(audit.live ?? "polite", "announced politely").toBe("polite");
    expect(audit.text, "saving text").toMatch(/Saving this meeting/);
  }
  return audit.visibleBeforeAudit && audit.visibleAfterAudit;
}

/** HD-5 oracle on an audit result. */
export function expectSavingAuditPasses(audit: SavingAudit): void {
  expect(audit.seenAt, "the saving line was seen").not.toBeNull();
  expect(audit.visibleBeforeAudit, "the line was on screen when axe started").toBe(true);
  expect(audit.visibleAfterAudit, "the line was still on screen when axe finished").toBe(true);
  expect(audit.role, "the saving line is a status").toBe("status");
  expect(audit.live ?? "polite", "announced politely").toBe("polite");
  expect(audit.text, "saving text").toMatch(/Saving this meeting/);
  expect(audit.violations, "axe violations on the end view while saving").toEqual([]);
}
