/**
 * Visible-focus probe for HD-4 (web-conferencing-hardening): after F6 the focused element must
 * show the focus fill, at least 3:1 against its resting fill and the page, with readable text.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { RECORDING } from "./wc-test-ids.ts";

type Rgb = readonly [number, number, number];

function parseRgb(css: string): Rgb | null {
  const match = css.match(/rgba?\(([^)]+)\)/);
  if (match === null || match[1] === undefined) return null;
  const parts = match[1]
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  const [r, g, b, a] = parts;
  if (r === undefined || g === undefined || b === undefined) return null;
  if (a !== undefined && a === 0) return null;
  return [r, g, b];
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number | null {
  const x = parseRgb(a);
  const y = parseRgb(b);
  if (x === null || y === null) return null;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export interface Paint {
  readonly background: string;
  readonly color: string;
}

export async function paintOf(locator: Locator): Promise<Paint> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, color: style.color };
  });
}

export async function pageBackground(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

/** data-slot of the focused element, or null when focus is on the body. */
export async function activeSlot(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (el === null || el === document.body) return null;
    return el.getAttribute("data-slot") ?? el.tagName.toLowerCase();
  });
}

export async function activeIsInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((s) => {
    const el = document.activeElement;
    return el !== null && el !== document.body && el.closest(s) !== null;
  }, selector);
}

/** Deletes library item 0 through the detail's Delete button and the confirm dialog. */
export async function deleteFirstRecording(page: Page): Promise<void> {
  await page.getByTestId(RECORDING.item).first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this recording?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete recording", exact: true }).click();
  await expect(dialog).toBeHidden();
}
