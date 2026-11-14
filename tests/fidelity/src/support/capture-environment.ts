import type { BrowserContext, BrowserContextOptions, Page, Route } from "@playwright/test";
import type { Access, Theme } from "./inventory.ts";

/**
 * Capture conditions shared by baseline capture (c03) and the boundary
 * comparison (c13). Changing any value here invalidates every baseline, so the
 * values are also recorded in baselines/manifest.json.
 */
export const CAPTURE_ENVIRONMENT = {
  /** km.js derives sample meetings and recordings from "now"; freeze it. */
  frozenClockIso: "2026-11-10T15:00:00.000Z",
  timezoneId: "UTC",
  locale: "en-US",
  deviceScaleFactor: 1,
  colorScheme: "dark" as const,
  reducedMotion: "no-preference" as const,
  themeStorageKey: "km-meet-theme",
  authStorageKey: "km-auth",
  signedInUser: { name: "Avery Chen", email: "avery@example.com" },
  /** Viewport heights paired with the four adopted widths. */
  viewportHeights: { 375: 812, 768: 1024, 1024: 768, 1440: 900 } as Record<number, number>,
  screenshot: { animations: "disabled", caret: "hide", scale: "css" } as const,
  /**
   * Window tokens (DESIGN.md D-8, km.css --window-medium / --window-expanded):
   * nav class bar < 600, rail 600-1023, inline >= 1024.
   */
  windowMedium: 600,
  windowExpanded: 1024,
} as const;

/** Self-hosted copies of the families the prototype requests from Google Fonts. */
const FONT_FACES: ReadonlyArray<{ family: string; weight: string; file: string }> = [
  { family: "Space Grotesk", weight: "300 700", file: "space-grotesk-variable.woff2" },
  { family: "Inter", weight: "400", file: "inter-regular.woff2" },
  { family: "Inter", weight: "500", file: "inter-medium.woff2" },
  { family: "Inter", weight: "600", file: "inter-semibold.woff2" },
  { family: "JetBrains Mono", weight: "500", file: "jetbrains-mono-medium.woff2" },
  { family: "JetBrains Mono", weight: "600", file: "jetbrains-mono-semibold.woff2" },
];

export function fontCss(fontBaseUrl: string): string {
  return FONT_FACES.map(
    (face) =>
      `@font-face{font-family:'${face.family}';font-style:normal;font-weight:${face.weight};` +
      `font-display:block;src:url('${fontBaseUrl}/${face.file}') format('woff2');}`,
  ).join("\n");
}

export function viewportFor(width: number): { width: number; height: number } {
  const height = CAPTURE_ENVIRONMENT.viewportHeights[width];
  if (height === undefined) throw new Error(`No adopted viewport for width ${width}`);
  return { width, height };
}

export function contextOptions(width: number): BrowserContextOptions {
  return {
    viewport: viewportFor(width),
    deviceScaleFactor: CAPTURE_ENVIRONMENT.deviceScaleFactor,
    timezoneId: CAPTURE_ENVIRONMENT.timezoneId,
    locale: CAPTURE_ENVIRONMENT.locale,
    colorScheme: CAPTURE_ENVIRONMENT.colorScheme,
    reducedMotion: CAPTURE_ENVIRONMENT.reducedMotion,
  };
}

export interface PrepareOptions {
  readonly theme: Theme;
  readonly access: Access;
  /** Origin allowed to serve pages; every other host is aborted and recorded. */
  readonly allowedOrigin: string;
  /** Where /__fonts/* is served (the static server's origin). Absent for the app. */
  readonly fontBaseUrl?: string;
  /** Collects every blocked external request URL for the manifest. */
  readonly blocked: string[];
}

/**
 * Sets the theme and sign-in state before any page script runs (both shells
 * read the same storage keys; see screen-inventory/theme-behaviour.md),
 * freezes the clock, routes Google Fonts to the self-hosted files and blocks
 * every other external request so captures are hermetic.
 */
export async function prepareContext(
  context: BrowserContext,
  options: PrepareOptions,
): Promise<void> {
  const auth =
    options.access === "sign-in" ? JSON.stringify(CAPTURE_ENVIRONMENT.signedInUser) : null;
  await context.addInitScript(
    ({ themeKey, theme, authKey, authValue }) => {
      try {
        window.localStorage.setItem(themeKey, theme);
        if (authValue === null) window.localStorage.removeItem(authKey);
        else window.localStorage.setItem(authKey, authValue);
      } catch {
        /* storage unavailable: the capture records the resulting render */
      }
    },
    {
      themeKey: CAPTURE_ENVIRONMENT.themeStorageKey,
      theme: options.theme,
      authKey: CAPTURE_ENVIRONMENT.authStorageKey,
      authValue: auth,
    },
  );
  await context.clock.setFixedTime(new Date(CAPTURE_ENVIRONMENT.frozenClockIso));
  await context.route("**/*", (route: Route) => routeRequest(route, options));
}

async function routeRequest(route: Route, options: PrepareOptions): Promise<void> {
  const url = new URL(route.request().url());
  if (
    url.origin === options.allowedOrigin ||
    url.protocol === "data:" ||
    url.protocol === "blob:"
  ) {
    await route.continue();
    return;
  }
  if (url.hostname === "fonts.googleapis.com" && options.fontBaseUrl !== undefined) {
    await route.fulfill({
      status: 200,
      contentType: "text/css",
      body: fontCss(options.fontBaseUrl),
    });
    return;
  }
  options.blocked.push(url.href);
  await route.abort("blockedbyclient");
}

/** Waits until the page, its web fonts and two animation frames have settled. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    );
  });
}
