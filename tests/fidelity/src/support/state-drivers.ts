import type { Locator, Page } from "@playwright/test";
import { CAPTURE_ENVIRONMENT, settle } from "./capture-environment.ts";
import type { InventoryEntry } from "./inventory.ts";

/** Shell parts that frame states interact with or crop to. */
export type UiRole = "appbar" | "account-button" | "nav-toggle" | "theme-toggle";

/** Where a state is rendered: the frozen prototype or the built app. */
export interface RenderTarget {
  readonly name: "prototype" | "app";
  urlFor(entry: InventoryEntry): string;
  selector(role: UiRole): string;
}

export type Interaction =
  | { readonly kind: "click"; readonly role: UiRole }
  | { readonly kind: "press"; readonly key: string };

export type CaptureRegion =
  | { readonly kind: "full-page" }
  | { readonly kind: "viewport" }
  | { readonly kind: "element"; readonly role: UiRole };

export interface StatePlan {
  readonly applicable: boolean;
  /** Why the state cannot exist at this viewport (only when not applicable). */
  readonly notApplicableReason?: string;
  readonly interactions: readonly Interaction[];
  readonly region: CaptureRegion;
  /** Human-readable description recorded in the manifest. */
  readonly method: string;
}

/** Selectors of the prototype's own controls (km.js mountAppBar). */
export const PROTOTYPE_SELECTORS: Readonly<Record<UiRole, string>> = {
  appbar: "#appbar",
  "account-button": ".acct-btn",
  "nav-toggle": ".appnav-toggle",
  "theme-toggle": ".theme-toggle",
};

const NAV_ONLY_BELOW = `The prototype collapses navigation only at <= ${CAPTURE_ENVIRONMENT.navCollapseMaxWidth}px (km.css bp-899); at wider viewports the state does not exist.`;

/** How each inventory state is reached and what is captured. */
export function planState(entry: InventoryEntry, viewport: number): StatePlan {
  const narrow = viewport <= CAPTURE_ENVIRONMENT.navCollapseMaxWidth;
  switch (entry.id) {
    case "frame.appbar-signed-out":
    case "frame.appbar-signed-in":
      return element("appbar", "load, crop to the app bar");
    case "frame.account-menu-open":
      return {
        applicable: true,
        interactions: [{ kind: "click", role: "account-button" }],
        region: { kind: "viewport" },
        method: "load signed in, click the account button (prototype .acct-btn), capture viewport",
      };
    case "frame.nav-collapsed":
      return narrow
        ? element("appbar", "load at a narrow viewport, crop to the app bar")
        : notApplicable();
    case "frame.nav-open":
      return narrow
        ? {
            applicable: true,
            interactions: [{ kind: "click", role: "nav-toggle" }],
            region: { kind: "viewport" },
            method:
              "load at a narrow viewport, click the menu button (prototype .appnav-toggle), capture viewport",
          }
        : notApplicable();
    case "frame.skip-link-focused":
      return {
        applicable: true,
        interactions: [{ kind: "press", key: "Tab" }],
        region: { kind: "viewport" },
        method: "load, press Tab once, capture viewport",
      };
    case "frame.theme-toggle":
      return element("theme-toggle", "load, crop to the theme toggle (sun in dark, moon in light)");
    default:
      return {
        applicable: true,
        interactions: [],
        region: { kind: "full-page" },
        method:
          entry.hash === ""
            ? "load page, full-page capture"
            : `load ${entry.hash}, full-page capture`,
      };
  }
}

function element(role: UiRole, method: string): StatePlan {
  return { applicable: true, interactions: [], region: { kind: "element", role }, method };
}

function notApplicable(): StatePlan {
  return {
    applicable: false,
    notApplicableReason: NAV_ONLY_BELOW,
    interactions: [],
    region: { kind: "viewport" },
    method: "not applicable",
  };
}

/** Navigates to a state and performs its interactions. */
export async function driveState(
  page: Page,
  target: RenderTarget,
  entry: InventoryEntry,
  plan: StatePlan,
): Promise<void> {
  await page.goto(target.urlFor(entry));
  await settle(page);
  for (const step of plan.interactions) {
    if (step.kind === "click") await page.locator(target.selector(step.role)).first().click();
    else await page.keyboard.press(step.key);
    await settle(page);
  }
}

/** What to screenshot for a plan: a page (full or viewport) or one element. */
export function captureSubject(
  page: Page,
  target: RenderTarget,
  plan: StatePlan,
): { subject: Page | Locator; fullPage: boolean } {
  if (plan.region.kind === "element") {
    return { subject: page.locator(target.selector(plan.region.role)).first(), fullPage: false };
  }
  return { subject: page, fullPage: plan.region.kind === "full-page" };
}
