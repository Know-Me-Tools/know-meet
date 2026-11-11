import type { Browser, BrowserContext, Page } from "@playwright/test";
import { contextOptions, prepareContext } from "./capture-environment.ts";
import type { InventoryEntry, Theme } from "./inventory.ts";
import { driveState, planState, type RenderTarget, type StatePlan } from "./state-drivers.ts";

export interface RenderedCell {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly plan: StatePlan;
  readonly blocked: readonly string[];
  readonly pageErrors: readonly string[];
}

/**
 * Renders one state/theme/viewport cell of a target under the same capture
 * environment the baselines were taken with. The app self-hosts its fonts, so
 * no font routing is applied; any external request is blocked and reported.
 * Returns null for cells the inventory marks not applicable at that viewport.
 */
export async function renderCell(
  browser: Browser,
  target: RenderTarget,
  entry: InventoryEntry,
  theme: Theme,
  viewport: number,
): Promise<RenderedCell | null> {
  const plan = planState(entry, viewport);
  if (!plan.applicable) return null;
  const context = await browser.newContext(contextOptions(viewport));
  const blocked: string[] = [];
  const pageErrors: string[] = [];
  const origin = new URL(target.urlFor(entry)).origin;
  await prepareContext(context, { theme, access: entry.access, allowedOrigin: origin, blocked });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await driveState(page, target, entry, plan);
  return { context, page, plan, blocked, pageErrors };
}
