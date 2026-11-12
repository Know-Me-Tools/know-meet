import type { Locator, Page } from "@playwright/test";
import { CAPTURE_ENVIRONMENT, settle } from "./capture-environment.ts";
import type { InventoryEntry } from "./inventory.ts";

/** Shell parts that frame states interact with, wait for or crop to. */
export type UiRole =
  | "appbar"
  | "account-button"
  | "theme-toggle"
  | "nav-bar"
  | "nav-rail"
  | "nav-inline";

/** Deterministic pin for the recordings "processing" frame (design-lead RV-36, tokens v1.5.0). */
export const PROCESSING_PIN_QUERY = "km-processing-pin=2";

/**
 * Prototype URL for a state, relative to the served design root. The processing pin is appended
 * exactly once, as a query before the hash, and only for `recordings.processing.*`. The app
 * target does not use this: its pin lives in oracle/app-state-map.json and is never appended.
 */
export function prototypeStatePath(entry: InventoryEntry): string {
  const file = entry.file.replace(/^docs\/design\//, "");
  const query = entry.id.startsWith("recordings.processing.") ? `?${PROCESSING_PIN_QUERY}` : "";
  return `${file}${query}${entry.hash}`;
}

/** Where a state is rendered: the frozen prototype or the built app. */
export interface RenderTarget {
  readonly name: "prototype" | "app";
  urlFor(entry: InventoryEntry): string;
  selector(role: UiRole): string;
}

export type Interaction =
  | { readonly kind: "click"; readonly role: UiRole }
  | { readonly kind: "press"; readonly key: string }
  /** Fails the cell unless the role is visible (for example the expected nav class). */
  | { readonly kind: "expect-visible"; readonly role: UiRole };

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

/**
 * Selectors of the prototype's own controls (km.js mountAppBar). km.js sets
 * html[data-nav-class] = bar | rail | inline from the window tokens.
 */
export const PROTOTYPE_SELECTORS: Readonly<Record<UiRole, string>> = {
  appbar: "#appbar",
  "account-button": ".acct-btn",
  "theme-toggle": ".theme-toggle",
  "nav-bar": 'html[data-nav-class="bar"] .appnav',
  "nav-rail": 'html[data-nav-class="rail"] .appnav',
  "nav-inline": 'html[data-nav-class="inline"] .appnav',
};

type NavClass = "bar" | "rail" | "inline";

/** Adaptive navigation classes (DESIGN.md D-8), keyed by inventory state ID. */
const NAV_STATES: Readonly<Record<string, { navClass: NavClass; range: string }>> = {
  "frame.nav-bar": { navClass: "bar", range: `width < ${CAPTURE_ENVIRONMENT.windowMedium}` },
  "frame.nav-rail": {
    navClass: "rail",
    range: `${CAPTURE_ENVIRONMENT.windowMedium} <= width < ${CAPTURE_ENVIRONMENT.windowExpanded}`,
  },
  "frame.nav-inline": {
    navClass: "inline",
    range: `width >= ${CAPTURE_ENVIRONMENT.windowExpanded}`,
  },
};

export function navClassFor(viewport: number): NavClass {
  if (viewport < CAPTURE_ENVIRONMENT.windowMedium) return "bar";
  return viewport < CAPTURE_ENVIRONMENT.windowExpanded ? "rail" : "inline";
}

/**
 * Nav states exist only inside their width class. The frame uses the same
 * fixed bar/rail geometry in prototype and app, and both are captured
 * full-page (Chromium paints the fixed nav at its first-viewport position).
 */
function navPlan(entry: InventoryEntry, viewport: number): StatePlan {
  const nav = NAV_STATES[entry.id];
  if (nav === undefined) throw new Error(`Not a nav state: ${entry.id}`);
  const listed = entry.viewports === undefined || entry.viewports.includes(viewport);
  if (navClassFor(viewport) !== nav.navClass || !listed) {
    return notApplicable(
      `nav class ${nav.navClass} exists only at ${nav.range} (DESIGN.md D-8); viewport ${viewport} renders ${navClassFor(viewport)}`,
    );
  }
  return {
    applicable: true,
    interactions: [{ kind: "expect-visible", role: `nav-${nav.navClass}` }],
    region: { kind: "full-page" },
    method: `load, require the ${nav.navClass} navigation (data-nav-class=${nav.navClass}), fixed-nav full-page capture`,
  };
}

/** How each inventory state is reached and what is captured. */
export function planState(entry: InventoryEntry, viewport: number): StatePlan {
  if (entry.id in NAV_STATES) return navPlan(entry, viewport);
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

function notApplicable(reason: string): StatePlan {
  return {
    applicable: false,
    notApplicableReason: reason,
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
    else if (step.kind === "expect-visible")
      await page.locator(target.selector(step.role)).first().waitFor({ state: "visible" });
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
