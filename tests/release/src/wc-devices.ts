/**
 * Device list reading for WC-5 and WC-6. The selects are the product's claim
 * about what is available; the active device is read from the browser's own
 * getUserMedia log (wc-taps.ts activeDeviceId), not from the select.
 */
import { expect, type Page } from "@playwright/test";
import { blocked } from "./release-env.ts";
import { DEVICES, SETTINGS_PANE_TITLE } from "./wc-test-ids.ts";

export interface SelectState {
  /** Option values (ASSUMPTION: the value is the deviceId), empty placeholders removed. */
  readonly values: readonly string[];
  readonly selected: string;
}

/** How long a select may take to list its devices after permission and the device refresh. */
const DEVICES_LISTED_TIMEOUT_MS = 20_000;
/** Fewer than this many devices cannot prove a choice; also the BLOCKED threshold in otherThan. */
const MIN_DEVICES_FOR_CHOICE = 2;

async function readOnce(page: Page, testId: string): Promise<SelectState> {
  return page.getByTestId(testId).evaluate((element) => {
    const select = element as HTMLSelectElement;
    return {
      values: [...select.options].map((option) => option.value).filter((value) => value !== ""),
      selected: select.value,
    };
  });
}

/**
 * Reads a device select once it has listed its devices. The select exists from the
 * start but shows only a placeholder (value "") until permission is granted and the
 * device refresh completes, so an immediate read can see no devices. This polls
 * (no fixed sleep) until at least two non-empty option values are present. If that
 * never happens within the timeout the last state is returned as is, and otherThan
 * reports BLOCKED: the fake-device fixture, not a race, is then the cause.
 */
export async function readSelect(page: Page, testId: string): Promise<SelectState> {
  await expect(page.getByTestId(testId)).toBeVisible();
  try {
    await expect
      .poll(async () => (await readOnce(page, testId)).values.length, {
        message: `${testId} lists its devices`,
        timeout: DEVICES_LISTED_TIMEOUT_MS,
      })
      .toBeGreaterThanOrEqual(MIN_DEVICES_FOR_CHOICE);
  } catch {
    // Fewer than two devices after the wait: report the state; otherThan decides BLOCKED.
  }
  return readOnce(page, testId);
}

/** A value to choose that is not `avoid`. Fewer than two devices means the fixture is unusable: BLOCKED. */
export function otherThan(state: SelectState, avoid: readonly string[], what: string): string {
  if (state.values.length < MIN_DEVICES_FOR_CHOICE) {
    throw blocked(
      `${what}: the browser offers fewer than two devices; the choice cannot be proven`,
    );
  }
  const choice = state.values.find((value) => !avoid.includes(value));
  if (choice === undefined) throw blocked(`${what}: no device other than the current one`);
  return choice;
}

/**
 * Opens the room Settings sheet on its "Audio and video" pane: the room device
 * selects and the Background section live there. Idempotent (a second call
 * does not close the sheet). The click goes through Playwright's auto-scroll,
 * so it works while the room bar scrolls sideways below 768px.
 */
export async function openRoomSettings(page: Page): Promise<void> {
  const control = page.getByTestId(DEVICES.roomSettings);
  if ((await control.getAttribute("aria-expanded")) !== "true") await control.click();
  await expect(control, "Settings is expanded").toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: SETTINGS_PANE_TITLE })).toBeVisible();
}
