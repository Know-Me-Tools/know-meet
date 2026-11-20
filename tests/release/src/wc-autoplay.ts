/**
 * WC-12: an emulated autoplay block for one browser context.
 *
 * Chromium's real policy cannot be observed under Playwright: every `evaluate` and locator
 * call is sent with `userGesture: true` (playwright-core `Runtime.callFunctionOn`), so a
 * driven page always counts as user-activated and audio is never blocked. This script
 * reproduces what the policy does at the API the app and the SDK actually see: an unmuted
 * `HTMLMediaElement.play()` is refused with `NotAllowedError` until the page receives a
 * trusted pointer event (a real click). The app's prompt, its click handler and the SDK's
 * `startAudio` all run unchanged.
 */
import type { BrowserContext, Page } from "@playwright/test";

const UNLOCKED_FLAG = "__kmAutoplayUnlocked";

const BLOCK_SCRIPT = `(() => {
  window.${UNLOCKED_FLAG} = false;
  const unlock = (event) => { if (event.isTrusted) window.${UNLOCKED_FLAG} = true; };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("click", unlock, true);
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!window.${UNLOCKED_FLAG} && !this.muted) {
      return Promise.reject(new DOMException("play() refused until a user gesture", "NotAllowedError"));
    }
    return play.call(this);
  };
})();`;

export async function emulateAutoplayBlock(context: BrowserContext): Promise<void> {
  await context.addInitScript({ content: BLOCK_SCRIPT });
}

/** True while the emulated block has not been lifted by a trusted pointer event. */
export async function autoplayStillBlocked(page: Page): Promise<boolean> {
  const value: unknown = await page.evaluate(`window.${UNLOCKED_FLAG}`);
  return value === false;
}
