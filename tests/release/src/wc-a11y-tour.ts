/**
 * WC-13 surface tour. Drives one live two-person meeting through every new
 * surface without reloading and calls `visit` at each state; the theme audit
 * passes an axe/stroke/fill audit at four widths, the reduced-motion test a
 * running-animation probe. A (requester) sees home, lobby, room controls, chat,
 * settings, effects, recording, history and recordings; B (autoplay blocked)
 * sees Enable audio, the remote share tile and the consent prompt.
 *
 * Joining is a hard prerequisite. Every surface after it is a soft step: a step
 * that cannot reach its surface is recorded in `unreached` with the reason and
 * the tour goes on, so one broken surface does not hide the others.
 */
import { expect, type Page } from "@playwright/test";
import { leave } from "./meeting-flow.ts";
import { SCREEN } from "./test-ids.ts";
import { emulateAutoplayBlock } from "./wc-autoplay.ts";
import { runTag, sendChat, uniqueText } from "./wc-chat.ts";
import { openRoomSettings } from "./wc-devices.ts";
import { reachNavigation } from "./wc-nav.ts";
import { answerConsent, expectIndicator, requestRecording, stopRecording } from "./wc-recording.ts";
import {
  expectRemoteCount,
  finishJoin,
  joinRoomWithoutUserActivation,
  openLobbyForNewMeeting,
  type Participant,
} from "./wc-room.ts";
import {
  AUDIENCE_EVERYONE,
  AUDIO_PROMPT,
  CHAT,
  DEVICES,
  EFFECTS,
  HISTORY,
  NAV,
  RECORDING,
  SHARE,
} from "./wc-test-ids.ts";

export type Visit = (surface: string, page: Page, prepare?: () => Promise<void>) => Promise<void>;

const PROMPT_TIMEOUT_MS = 30_000;
const SHARE_TIMEOUT_MS = 30_000;
/** How long the tour records at least, so the saved file holds playable media. */
const MIN_RECORDING_MS = 4000;

/** Call before B's first navigation: B's audio stays blocked until a trusted click. */
export async function prepareListener(b: Participant): Promise<void> {
  await emulateAutoplayBlock(b.context);
}

export async function tourSurfaces(
  a: Participant,
  b: Participant,
  visit: Visit,
  unreached: string[],
): Promise<void> {
  const step = async (surface: string, body: () => Promise<void>): Promise<void> => {
    try {
      await body();
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      unreached.push(`${surface}: ${message}`);
    }
  };

  await step("home-nav", async () => {
    await a.page.goto("/");
    await expect(a.page.getByTestId(SCREEN.home)).toBeVisible();
    await expect(a.page.getByTestId(NAV.home)).toBeVisible();
    await visit("home-nav", a.page);
  });

  // Hard prerequisite: the meeting both participants are in.
  const { code } = await openLobbyForNewMeeting(a.page);
  await step("lobby-devices", async () => {
    await expect(a.page.getByTestId(DEVICES.lobbyMicSelect)).toBeVisible();
    await expect(a.page.getByTestId(DEVICES.lobbyCameraSelect)).toBeVisible();
    await expect(a.page.getByTestId(DEVICES.lobbyMicLevel)).toBeVisible();
    await visit("lobby-devices", a.page);
  });
  await finishJoin(a.page, a.name, code, { mic: true, camera: true });
  await joinRoomWithoutUserActivation(b, code);
  await expectRemoteCount(a.page, 1, "A: remote tiles");
  await expectRemoteCount(b.page, 1, "B: remote tiles");

  await step("enable-audio", async () => {
    const prompt = b.page.getByRole("button", {
      name: AUDIO_PROMPT.buttonName,
    });
    await expect(prompt).toBeVisible({ timeout: PROMPT_TIMEOUT_MS });
    await visit("enable-audio", b.page);
    await prompt.click();
    await expect(prompt).toHaveCount(0);
  });

  await step("room-sharing", async () => {
    const control = a.page.getByTestId(SHARE.control);
    await control.click();
    await expect(control).toHaveAttribute("data-state", "on");
    await expect(b.page.getByTestId(SHARE.tile)).toBeVisible({
      timeout: SHARE_TIMEOUT_MS,
    });
    await visit("room-sharing", a.page);
    await visit("share-tile", b.page);
    await control.click();
    await expect(control).toHaveAttribute("data-state", "off");
  });

  await step("chat-panel", async () => {
    await sendChat(a.page, uniqueText(runTag(), "a11y"), AUDIENCE_EVERYONE);
    // The audience picker pointed at one participant (the private state).
    await a.page.getByTestId(CHAT.audience).selectOption({ label: b.name });
    await visit("chat-panel", a.page);
    await a.page.getByTestId(CHAT.audience).selectOption({ label: AUDIENCE_EVERYONE });
    const toggle = a.page.getByTestId(CHAT.toggle);
    if ((await toggle.getAttribute("aria-expanded")) === "true") await toggle.click();
  });

  await step("room-settings", async () => {
    await openRoomSettings(a.page);
    await expect(a.page.getByTestId(DEVICES.roomSpeakerSelect)).toBeVisible();
    await visit("room-settings", a.page);
  });

  await step("room-effects", async () => {
    await openRoomSettings(a.page);
    // On software graphics (headless Chromium) the section shows the "not available" note
    // instead of the choices (repair 9); that note is the surface to audit there.
    const unavailable = a.page.getByTestId(EFFECTS.unavailable);
    if (await unavailable.isVisible()) {
      await visit("room-effects", a.page, () => unavailable.scrollIntoViewIfNeeded());
      const settings = a.page.getByTestId(DEVICES.roomSettings);
      if ((await settings.getAttribute("aria-expanded")) === "true") await settings.click();
      return;
    }
    const group = a.page.getByRole("radiogroup", { name: EFFECTS.groupName });
    await expect(group).toBeVisible();
    await a.page.getByTestId(EFFECTS.blur).click();
    await expect(a.page.getByTestId(EFFECTS.blur)).toBeChecked();
    await visit("room-effects", a.page, () => group.scrollIntoViewIfNeeded());
    await a.page.getByTestId(EFFECTS.off).click();
    const control = a.page.getByTestId(DEVICES.roomSettings);
    if ((await control.getAttribute("aria-expanded")) === "true") await control.click();
  });

  await step("recording-consent", async () => {
    await requestRecording(a.page);
    await expect(b.page.getByTestId(RECORDING.prompt)).toBeVisible();
    await visit("recording-consent", b.page);
  });

  await step("recording-indicator", async () => {
    await answerConsent(b.page, true);
    await expectIndicator(a.page, true, "A shows the indicator");
    await expectIndicator(b.page, true, "B shows the indicator");
    await visit("recording-indicator", a.page);
    await visit("recording-indicator-b", b.page);
    // The playback surfaces need a file with media in it. The reduced-motion pass visits
    // fast enough to stop within a second, which wrote 0 bytes (2026-11-20 run 1).
    await a.page.waitForTimeout(MIN_RECORDING_MS);
    await stopRecording(a.page);
  });

  await leave(a.page);
  await reachNavigation(a.page);

  await step("history-list", async () => {
    await a.page.getByTestId(HISTORY.nav).click();
    await expect(a.page.getByTestId(HISTORY.screen)).toBeVisible();
    await expect(a.page.getByTestId(HISTORY.entry).first()).toBeVisible();
    await visit("history-list", a.page);
  });

  await step("history-detail", async () => {
    await a.page.getByTestId(HISTORY.entryOpen).first().click();
    await expect(a.page.getByTestId(HISTORY.del)).toBeVisible();
    await visit("history-detail", a.page);
  });

  await step("history-delete-confirm", async () => {
    await a.page.getByTestId(HISTORY.del).click();
    await expect(a.page.getByTestId(HISTORY.deleteConfirm)).toBeVisible();
    await visit("history-delete-confirm", a.page);
    await a.page.getByTestId(HISTORY.deleteConfirm).click();
    await expect(a.page.getByTestId(HISTORY.deleteConfirm)).toHaveCount(0);
  });

  await step("recordings-library", async () => {
    await reachNavigation(a.page);
    await a.page.getByTestId(RECORDING.nav).click();
    await expect(a.page.getByTestId(RECORDING.library)).toBeVisible();
    await expect(a.page.getByTestId(RECORDING.item).first()).toBeVisible();
    await visit("recordings-library", a.page);
  });

  await step("recordings-detail", async () => {
    await a.page.getByTestId(RECORDING.item).first().click();
    await expect(a.page.getByTestId(RECORDING.play)).toBeVisible();
    await visit("recordings-detail", a.page);
  });

  await step("recordings-playback", async () => {
    await a.page.getByTestId(RECORDING.play).click();
    await expect
      .poll(() =>
        a.page.getByTestId(RECORDING.player).evaluate((el) => !(el as HTMLVideoElement).paused),
      )
      .toBe(true);
    await visit("recordings-playback", a.page);
  });
}
