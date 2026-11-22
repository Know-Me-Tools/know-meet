/**
 * Init scripts that change what the browser reports before the page loads (HD-2,
 * web-conferencing-hardening). The app reads background-effects support once per module and
 * caches it, so every variant must be installed with addInitScript before the first navigation.
 * Nothing here changes the app: the production image carries no test switch.
 */
import type { BrowserContext } from "@playwright/test";

/** No OffscreenCanvas: the browser lacks a feature the effect engine needs. */
const NO_OFFSCREEN_CANVAS = `
  try { delete globalThis.OffscreenCanvas; } catch {}
  Object.defineProperty(globalThis, "OffscreenCanvas", { value: undefined, configurable: true });
`;

/** OffscreenCanvas present, but no WebGL2 context at all (getContext returns null). */
const NO_WEBGL2 = `
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    if (kind === "webgl2") return null;
    return original.call(this, kind, ...rest);
  };
`;

export type SupportVariant = "no-offscreen-canvas" | "no-webgl2";

export async function installSupportVariant(
  context: BrowserContext,
  variant: SupportVariant,
): Promise<void> {
  await context.addInitScript({
    content: variant === "no-offscreen-canvas" ? NO_OFFSCREEN_CANVAS : NO_WEBGL2,
  });
}

/** The note shown for each unsupported cause (W3, plan.md copy). */
export const GRAPHICS_NOTE = /Turn on hardware acceleration/;
export const BROWSER_NOTE = /This browser can.t run background effects/;
