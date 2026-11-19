/**
 * Chat driving and observation for WC-2, WC-3 and WC-7, through the CHAT
 * contract in wc-test-ids.ts. Observations of the panel are the product's
 * claim; the wire probe (wireContains) is the browser's, independent of it.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { readTaps } from "./wc-taps.ts";
import { AUDIENCE_EVERYONE, CHAT } from "./wc-test-ids.ts";

export type Audience = typeof AUDIENCE_EVERYONE | { readonly privateTo: string };

/** The unique text of one message: fixed prefix, role word, per-run tag. */
export function uniqueText(runTag: string, role: string): string {
  return `km-${runTag}-${role}`;
}

/** A per-run tag that does not look like a room code or a name. */
export function runTag(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function ensurePanelOpen(page: Page): Promise<void> {
  if (await page.getByTestId(CHAT.panel).isVisible()) return;
  await page.getByTestId(CHAT.toggle).click();
  await expect(page.getByTestId(CHAT.panel)).toBeVisible();
}

export async function sendChat(page: Page, text: string, audience: Audience): Promise<void> {
  await ensurePanelOpen(page);
  const label = audience === AUDIENCE_EVERYONE ? AUDIENCE_EVERYONE : audience.privateTo;
  await page.getByTestId(CHAT.audience).selectOption({ label });
  await page.getByTestId(CHAT.input).fill(text);
  await page.getByTestId(CHAT.send).click();
}

/** Messages in the panel whose text is exactly `text`. */
export function messagesWithText(page: Page, text: string): Locator {
  return page
    .getByTestId(CHAT.message)
    .filter({ has: page.getByTestId(CHAT.messageText).and(page.getByText(text, { exact: true })) });
}

/** Exactly one message with this text, labelled with an audience matching `label`. */
export async function expectMessage(
  page: Page,
  text: string,
  label: RegExp | string,
  who: string,
): Promise<void> {
  await ensurePanelOpen(page);
  const message = messagesWithText(page, text);
  await expect(message, `${who}: one message with the sent text`).toHaveCount(1);
  const audience = message.getByTestId(CHAT.messageAudience);
  await expect(audience, `${who}: audience label`).toHaveText(label);
}

/** Probe for holdsFor: null while no message with this text is in the panel. */
export async function panelLacks(page: Page, text: string): Promise<string | null> {
  const count = await messagesWithText(page, text).count();
  return count === 0 ? null : `panel shows ${count} message(s) with the text`;
}

/** Probe for holdsFor: null while no data-channel message this browser received contains the text. */
export async function wireLacks(page: Page, text: string): Promise<string | null> {
  const taps = await readTaps(page);
  const hit = taps.wire.find((message) => message.text.includes(text));
  return hit === undefined
    ? null
    : `data channel "${hit.label}" delivered the text to this browser`;
}

/** Number of data-channel messages this browser received (non-vacuity check for wireLacks). */
export async function wireCount(page: Page): Promise<number> {
  return (await readTaps(page)).wire.length;
}

/** True when this browser's data channel delivered the text (the control's positive observation). */
export async function wireHas(page: Page, text: string): Promise<boolean> {
  return (await wireLacks(page, text)) !== null;
}
