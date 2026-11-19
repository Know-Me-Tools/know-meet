/**
 * Navigation helper for the WC specs. DESIGN.md "Hosted build navigation
 * (operator 2026-11-18)": the adaptive navigation (km-nav-home, km-nav-history,
 * km-nav-recordings) exists only on /, /history* and /recordings*, never on
 * /join or /meet. After leaving a room the page still shows the meeting-ended
 * view on /meet, so a spec must reach / first, through that view's Home link
 * (client-side navigation, no URL carries a history id).
 *
 * The hosted nav links carry one data-testid each (km-nav-home, km-nav-history,
 * km-nav-recordings); km-nav-item belongs to the default build only. No spec
 * addresses one element by both.
 */
import { expect, type Page } from "@playwright/test";
import { NAV } from "./wc-test-ids.ts";

const NO_NAV_PATHS = /^\/(?:join|meet)(?:\/|$)/;

/** Makes the adaptive navigation reachable: leaves /meet and /join through the Home link. */
export async function reachNavigation(page: Page): Promise<void> {
  if (NO_NAV_PATHS.test(new URL(page.url()).pathname)) {
    // The meeting-ended view's Home button; exact name excludes the "Know Meet home" brand link.
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/");
  }
  await expect(page.getByTestId(NAV.home)).toBeVisible();
}
