/**
 * Recording observation for WC-8 and WC-9. The consent oracle never relies on
 * the application's own recording state alone. Three independent witnesses must
 * agree that a recording did NOT start (or DID start):
 *
 *   1. the UI: recording indicator present on every participant's page;
 *   2. the browser: MediaRecorder starts and stops counted by the page tap;
 *   3. the disk: new files in the origin private file system, listed by the
 *      browser's own API, not read from the app's library index.
 *
 * A consent gate that is removed or reordered moves witness 2 and 3 at once, so
 * the spec fails even if the indicator code is still correct.
 */
import { expect, type Page } from "@playwright/test";
import { leave } from "./meeting-flow.ts";
import { reachNavigation } from "./wc-nav.ts";
import type { Participant } from "./wc-room.ts";
import { type OpfsEntry, opfsEntries, readTaps } from "./wc-taps.ts";
import { RECORDING } from "./wc-test-ids.ts";

export const RECORD_WINDOW_MS = 20_000;
export const DURATION_TOLERANCE_MS = 3_000;

export async function requestRecording(page: Page): Promise<void> {
  await page.getByTestId(RECORDING.control).click();
}

export async function stopRecording(page: Page): Promise<void> {
  const control = page.getByTestId(RECORDING.control);
  await expect(control).toHaveAttribute("data-state", "on");
  await control.click();
  await expect(control).toHaveAttribute("data-state", "off");
}

export async function answerConsent(page: Page, agree: boolean): Promise<void> {
  const prompt = page.getByTestId(RECORDING.prompt);
  await expect(prompt, "consent prompt is shown").toBeVisible();
  await page.getByTestId(agree ? RECORDING.agree : RECORDING.decline).click();
  await expect(prompt, "consent prompt closes after the answer").toBeHidden();
}

export async function expectIndicator(page: Page, visible: boolean, label: string): Promise<void> {
  const indicator = page.getByTestId(RECORDING.indicator);
  if (visible) await expect(indicator, label).toBeVisible();
  else await expect(indicator, label).toHaveCount(0);
}

export interface DiskBaseline {
  readonly participant: Participant;
  readonly files: readonly OpfsEntry[];
}

export async function diskBaselines(
  participants: readonly Participant[],
): Promise<readonly DiskBaseline[]> {
  const out: DiskBaseline[] = [];
  for (const participant of participants) {
    out.push({ participant, files: await opfsEntries(participant.page) });
  }
  return out;
}

function addedFiles(before: readonly OpfsEntry[], after: readonly OpfsEntry[]): OpfsEntry[] {
  const known = new Set(before.map((entry) => entry.path));
  return after.filter((entry) => !known.has(entry.path));
}

/**
 * null while nothing is recording anywhere: no indicator, no MediaRecorder start,
 * no new file. A description of the first witness that disagrees otherwise.
 */
export async function notRecordingProbe(
  baselines: readonly DiskBaseline[],
): Promise<string | null> {
  for (const { participant, files } of baselines) {
    const { page, name } = participant;
    const indicators = await page.getByTestId(RECORDING.indicator).count();
    if (indicators !== 0) return `${name}: recording indicator is shown`;
    const { recorder } = await readTaps(page);
    if (recorder.started !== 0) return `${name}: MediaRecorder started ${recorder.started} time(s)`;
    const added = addedFiles(files, await opfsEntries(page));
    if (added.length !== 0)
      return `${name}: ${added.length} new file(s) on disk (${added[0]?.path})`;
  }
  return null;
}

/**
 * Opens /recordings through the shared adaptive navigation, after leaving the room.
 * The navigation is not shown on /meet, so it goes home first (reachNavigation).
 */
export async function openLibraryAfterLeaving(page: Page): Promise<void> {
  await leave(page);
  await reachNavigation(page);
  await page.getByTestId(RECORDING.nav).click();
  await expect(page).toHaveURL(/\/recordings(?:#|$)/);
  await expect(page.getByTestId(RECORDING.library)).toBeVisible();
}

export interface LibraryItem {
  readonly durationMs: number;
  readonly sizeBytes: number;
}

export async function readLibrary(page: Page): Promise<LibraryItem[]> {
  const items = page.getByTestId(RECORDING.item);
  const out: LibraryItem[] = [];
  for (let i = 0; i < (await items.count()); i += 1) {
    const item = items.nth(i);
    out.push({
      durationMs: Number(await item.getAttribute("data-duration-ms")),
      sizeBytes: Number(await item.getAttribute("data-size-bytes")),
    });
  }
  return out;
}

export interface PlaybackObservation {
  readonly src: string;
  readonly paused: boolean;
  readonly currentTime: number;
}

export async function observePlayer(page: Page): Promise<PlaybackObservation> {
  return page.getByTestId(RECORDING.player).evaluate((element) => {
    const video = element as HTMLVideoElement;
    return {
      src: video.currentSrc || video.src,
      paused: video.paused,
      currentTime: video.currentTime,
    };
  });
}
