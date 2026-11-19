/**
 * WC-12 Enable audio appears when autoplay is blocked and starts audio
 * (features/wc-12-enable-audio.feature). Packaged then hosted, Chromium, two
 * launches with different autoplay policies (src/browser-args.ts).
 *
 * B must never receive a user activation before the prompt is observed: a
 * trusted click on "Join meeting" would itself unlock playback. B therefore
 * joins with synthetic clicks (joinRoomWithoutUserActivation) and the spec
 * checks navigator.userActivation.hasBeenActive is false as a precondition. A
 * run that cannot establish the precondition is BLOCKED, never a pass.
 */
import { type Browser, chromium, expect, type Page, test } from "@playwright/test";
import { AUTOPLAY_ALLOWED_ARG, AUTOPLAY_BLOCKED_ARG, FAKE_MEDIA_ARGS } from "./src/browser-args.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { blocked } from "./src/release-env.ts";
import { ROOM, SCREEN } from "./src/test-ids.ts";
import {
  closeAll,
  contextDefaults,
  expectRemoteCount,
  holdsFor,
  joinRoomWithoutUserActivation,
  newParticipant,
  startRoom,
} from "./src/wc-room.ts";
import { AUDIO_PROMPT } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 5 * 60 * 1000;
const NEGATIVE_WINDOW_MS = 5_000;

async function hasBeenActive(page: Page): Promise<boolean> {
  const value: unknown = await page.evaluate(
    "navigator.userActivation ? navigator.userActivation.hasBeenActive : null",
  );
  if (typeof value !== "boolean")
    throw blocked("navigator.userActivation is not available in this browser");
  return value;
}

/** True when a remote audio element is attached to a decoded, playing stream. */
async function remoteAudioPlaying(page: Page): Promise<boolean> {
  const audio = page.getByTestId(ROOM.remoteAudio);
  if ((await audio.count()) === 0) return false;
  return audio.first().evaluate((el) => {
    const element = el as HTMLAudioElement;
    return !element.paused && element.readyState >= 2;
  });
}

async function launch(policyArg: string): Promise<Browser> {
  return chromium.launch({ args: [...FAKE_MEDIA_ARGS, policyArg] });
}

test.describe("WC-12 Enable audio appears when autoplay is blocked and starts audio", () => {
  test(
    "with autoplay blocked B shows Enable audio; one click starts audio and the prompt goes",
    { tag: ["@WC-12", "@value-critical", "@smoke"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const browser = await launch(AUTOPLAY_BLOCKED_ARG);
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      try {
        const code = await startRoom(a);
        await joinRoomWithoutUserActivation(b, code);
        await expectRemoteCount(b.page, 1, "B: remote tiles");
        expect(await hasBeenActive(b.page), "precondition: B has had no user activation").toBe(
          false,
        );

        const prompt = b.page.getByRole("button", { name: AUDIO_PROMPT.buttonName });
        await expect(prompt, "B shows Enable audio").toBeVisible({ timeout: 30_000 });
        await expect(b.page.getByTestId(SCREEN.meet)).toHaveAttribute(
          AUDIO_PROMPT.stateAttribute,
          "false",
        );
        expect(await remoteAudioPlaying(b.page), "audio is not playing before the click").toBe(
          false,
        );
        await attachScreenshot(testInfo, b.page, "wc-12-blocked-prompt");

        await prompt.click();
        await expect(prompt, "prompt disappears after one click").toHaveCount(0);
        await expect(b.page.getByTestId(SCREEN.meet)).toHaveAttribute(
          AUDIO_PROMPT.stateAttribute,
          "true",
        );
        await expect
          .poll(() => remoteAudioPlaying(b.page), { message: "remote audio plays after the click" })
          .toBe(true);
        await attachJson(testInfo, "wc-12-run.json", {
          roomCode: code,
          policy: AUTOPLAY_BLOCKED_ARG,
        });
        await attachScreenshot(testInfo, b.page, "wc-12-after-click");
      } finally {
        await closeAll([a, b]);
        await browser.close();
      }
    },
  );

  test(
    "with autoplay allowed no Enable audio prompt is shown",
    { tag: ["@WC-12", "@negative-control"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const browser = await launch(AUTOPLAY_ALLOWED_ARG);
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      try {
        const code = await startRoom(a);
        await joinRoomWithoutUserActivation(b, code);
        await expectRemoteCount(b.page, 1, "B: remote tiles");
        // Audio is playing without any click: the prompt has nothing to ask for.
        await expect
          .poll(() => remoteAudioPlaying(b.page), { message: "remote audio plays unaided" })
          .toBe(true);
        await holdsFor(b.page, NEGATIVE_WINDOW_MS, "no Enable audio prompt", async () => {
          const count = await b.page.getByRole("button", { name: AUDIO_PROMPT.buttonName }).count();
          return count === 0 ? null : "Enable audio is shown although playback is allowed";
        });
        await attachScreenshot(testInfo, b.page, "wc-12-allowed-no-prompt");
      } finally {
        await closeAll([a, b]);
        await browser.close();
      }
    },
  );
});
