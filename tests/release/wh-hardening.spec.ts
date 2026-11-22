/**
 * Hardening scenarios HD-1, HD-2 and HD-4 (web-conferencing-hardening, amendment 3; HD-5 is in
 * wc-13-accessibility.spec.ts).
 *
 * HD-1 Background says "Preparing" only when it is, and choosing None does not prepare again.
 *      Headed Chromium on the host GPU (project packaged-gpu, @gpu): on a software GPU the
 *      effect engine freezes the page (wc4-measure-2026-11-20), so this path is GPU-only. The
 *      pane stays mounted while closed, so the real triggers are join and camera-on.
 * HD-2 The unsupported note names its cause (packaged headless Chromium, software GPU).
 * HD-4 F6 shows focus on the toast and Tab or Shift+Tab goes back (recordings screen).
 *
 * Every override is test-side (init scripts, routing); the production image carries no test switch.
 */
import { expect, type Page, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { DATA_STATE, ROOM } from "./src/test-ids.ts";
import { openRoomSettings } from "./src/wc-devices.ts";
import { openLibraryAfterLeaving, requestRecording, stopRecording } from "./src/wc-recording.ts";
import { closeAll, contextDefaults, newParticipant, startRoom } from "./src/wc-room.ts";
import { EFFECTS, RECORDING } from "./src/wc-test-ids.ts";
import {
  activeIsInside,
  contrastRatio,
  deleteFirstRecording,
  pageBackground,
  paintOf,
} from "./src/wh-focus.ts";
import {
  attachCount,
  clearEffectLog,
  type EffectLogEntry,
  installAttachCounter,
  readEffectLog,
  startEffectLog,
} from "./src/wh-observer.ts";
import {
  BROWSER_NOTE,
  GRAPHICS_NOTE,
  installSupportVariant,
  type SupportVariant,
} from "./src/wh-support-stubs.ts";

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;
/** Cold GPU preparation was measured at 6.5 s; allow headroom on a loaded host. */
const PREPARE_TIMEOUT_MS = 30_000;
/** HD-1 (b) and (c): how long the log is watched once the camera is on again. */
const CAMERA_ON_WATCH_MS = 3_000;
/** HD-1 (e): how long after None a re-preparation is watched for. */
const NONE_WATCH_MS = 5_000;
const CONTROL_RECORDING_MS = 5_000;
const MAX_TABS_TO_LEAVE = 3;
const TOAST = '[data-slot="toast"]';
const TOAST_VIEWPORT = '[data-slot="toast-viewport"]';

const preparingEntries = (log: readonly EffectLogEntry[]) =>
  log.filter((e) => e.state === "preparing");

/** Camera off, then on, by the room's own control. The log holds only what the camera-on caused. */
async function cameraOffAndOn(page: Page): Promise<void> {
  const control = page.getByTestId(ROOM.muteCamera);
  await control.click();
  await expect(control, "the camera is off").toHaveAttribute(DATA_STATE, "off");
  await clearEffectLog(page);
  await control.click();
  await expect(control, "the camera is on again").toHaveAttribute(DATA_STATE, "on", {
    timeout: PREPARE_TIMEOUT_MS,
  });
}

test.describe("HD-1 Background says Preparing only when it is", () => {
  test(
    "Preparing shows without aria-busy; camera-on with a ready engine or an effect shows none; loading is busy; None does not prepare again",
    { tag: ["@HD-1", "@gpu", "@packaged-only"] },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(5 * 60 * 1000);
      const a = await newParticipant(browser, "Guest A", testInfo, {
        contextOptions: contextDefaults(baseURL),
      });
      let releaseFiles = (): void => undefined;
      try {
        await installAttachCounter(a.context);
        // Preparation starts on join: hold the effect files until the pane is open and shows it.
        const released = new Promise<void>((resolve) => {
          releaseFiles = resolve;
        });
        await a.page.route("**/mediapipe/**", async (route) => {
          await released;
          await route.continue();
        });
        await startRoom(a);
        const renderer = await a.page.evaluate(() => {
          const gl = document.createElement("canvas").getContext("webgl2");
          const info = gl?.getExtension("WEBGL_debug_renderer_info");
          return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "no webgl2";
        });
        await attachJson(testInfo, "hd-1-renderer.json", { renderer });
        if (SOFTWARE_RENDERER.test(renderer) || renderer === "no webgl2") {
          throw new Error(`BLOCKED: HD-1 needs the host GPU; got ${renderer}`);
        }
        await startEffectLog(a.page);
        const status = a.page.getByTestId(EFFECTS.status);
        const tile = a.page.getByTestId(ROOM.localTile);

        // (a) Preparing is visible in the open pane (positive), and the group is not busy meanwhile.
        await openRoomSettings(a.page);
        await expect(a.page.getByRole("radiogroup", { name: EFFECTS.groupName })).toBeVisible();
        await expect(status, "(a) Preparing while the files are held").toHaveAttribute(
          "data-state",
          "preparing",
          {
            timeout: PREPARE_TIMEOUT_MS,
          },
        );
        await expect(status).toBeVisible();
        await expect(status).toContainText("Preparing background effects");
        await attachScreenshot(testInfo, a.page, "hd-1-preparing");
        releaseFiles();
        await expect(status, "(a) released").toHaveAttribute("data-state", "none", {
          timeout: PREPARE_TIMEOUT_MS,
        });
        const cold = await readEffectLog(a.page);
        await attachJson(testInfo, "hd-1-a-preparing.json", cold);
        expect(preparingEntries(cold).length, "(a) Preparing was logged").toBeGreaterThan(0);
        expect(
          cold.filter((e) => e.state === "preparing" && e.busy === "true"),
          "(a) the group is not busy while preparing",
        ).toEqual([]);
        if ((await attachCount(a.page)) < 1)
          throw new Error("BLOCKED: (e) the attach probe saw no preparation");

        // (c) Camera on again with a ready engine and no effect: no Preparing (a display check).
        await cameraOffAndOn(a.page);
        await a.page.waitForTimeout(CAMERA_ON_WATCH_MS);
        const warm = await readEffectLog(a.page);
        await attachJson(testInfo, "hd-1-c-camera-on-ready.json", warm);
        expect(preparingEntries(warm), "(c) no Preparing with a ready engine").toEqual([]);

        // (b) Camera on again with Blur applied: no Preparing (a display check).
        await a.page.getByTestId(EFFECTS.blur).click();
        await expect(tile).toHaveAttribute(EFFECTS.processorAttribute, "background-blur", {
          timeout: PREPARE_TIMEOUT_MS,
        });
        await expect(status).toHaveAttribute("data-state", "none", { timeout: PREPARE_TIMEOUT_MS });
        await cameraOffAndOn(a.page);
        await a.page.waitForTimeout(CAMERA_ON_WATCH_MS);
        const withEffect = await readEffectLog(a.page);
        await attachJson(testInfo, "hd-1-b-camera-on-effect.json", withEffect);
        expect(preparingEntries(withEffect), "(b) no Preparing with an effect on").toEqual([]);
        await expect(tile).toHaveAttribute(EFFECTS.processorAttribute, "background-blur", {
          timeout: PREPARE_TIMEOUT_MS,
        });

        // (d) Choosing an image: busy while loading.
        await clearEffectLog(a.page);
        await a.page.getByTestId(EFFECTS.imageOption).first().click();
        await expect(tile).toHaveAttribute(EFFECTS.processorAttribute, "virtual-background", {
          timeout: PREPARE_TIMEOUT_MS,
        });
        await expect(status).toHaveAttribute("data-state", "none", { timeout: PREPARE_TIMEOUT_MS });
        const loading = await readEffectLog(a.page);
        await attachJson(testInfo, "hd-1-d-image-loading.json", loading);
        expect(
          loading.filter((e) => e.state === "loading" && e.busy === "true").length,
          "(d) the group is busy while a chosen effect loads",
        ).toBeGreaterThan(0);

        // (e) None, with the pane open and the camera on: the engine is not attached again.
        await clearEffectLog(a.page);
        const beforeNone = await attachCount(a.page);
        await a.page.getByTestId(EFFECTS.off).click();
        await expect(tile).toHaveAttribute(EFFECTS.processorAttribute, "none", {
          timeout: PREPARE_TIMEOUT_MS,
        });
        await a.page.waitForTimeout(NONE_WATCH_MS);
        const afterNone = await attachCount(a.page);
        const noneLog = await readEffectLog(a.page);
        await attachJson(testInfo, "hd-1-e-none.json", { beforeNone, afterNone, log: noneLog });
        expect(afterNone, "(e) None does not attach the engine again").toBeLessThanOrEqual(
          beforeNone,
        );
        expect(preparingEntries(noneLog), "(e) no Preparing after None").toEqual([]);

        // (e) control: with no processor attached, camera-on prepares, and the probe sees it.
        await cameraOffAndOn(a.page);
        try {
          await expect
            .poll(() => attachCount(a.page), { timeout: PREPARE_TIMEOUT_MS })
            .toBeGreaterThan(afterNone);
        } catch (error) {
          throw new Error("BLOCKED: (e) the attach probe did not see a re-preparation", {
            cause: error,
          });
        }
        await attachJson(testInfo, "hd-1-e-control.json", {
          afterNone,
          afterCameraOn: await attachCount(a.page),
        });
        await attachScreenshot(testInfo, a.page, "hd-1-end");
      } finally {
        releaseFiles();
        await closeAll([a]);
      }
    },
  );
});

test.describe("HD-2 The unsupported note names its cause", () => {
  const cases: ReadonlyArray<{
    variant: SupportVariant | null;
    note: RegExp;
    other: RegExp;
    label: string;
  }> = [
    {
      variant: null,
      note: GRAPHICS_NOTE,
      other: BROWSER_NOTE,
      label: "software GPU: graphics note",
    },
    {
      variant: "no-offscreen-canvas",
      note: BROWSER_NOTE,
      other: GRAPHICS_NOTE,
      label: "no OffscreenCanvas: browser note",
    },
    {
      variant: "no-webgl2",
      note: BROWSER_NOTE,
      other: GRAPHICS_NOTE,
      label: "no WebGL2 context: browser note",
    },
  ];
  for (const c of cases) {
    test(c.label, { tag: ["@HD-2", "@packaged-only"] }, async ({ browser, baseURL }, testInfo) => {
      test.skip(browser.browserType().name() !== "chromium", "HD-2 runs in packaged Chromium");
      const a = await newParticipant(browser, "Guest A", testInfo, {
        contextOptions: contextDefaults(baseURL),
      });
      try {
        if (c.variant !== null) await installSupportVariant(a.context, c.variant);
        await startRoom(a);
        await openRoomSettings(a.page);
        const note = a.page.getByTestId(EFFECTS.unavailable);
        await expect(note, "the unsupported note shows").toBeVisible();
        await expect(note).toHaveText(c.note);
        await expect(note).not.toHaveText(c.other);
        await expect(
          a.page.getByRole("radiogroup", { name: EFFECTS.groupName }),
          "no radio group",
        ).toHaveCount(0);
        await attachScreenshot(testInfo, a.page, `hd-2-${c.variant ?? "software-gpu"}`);
      } finally {
        await closeAll([a]);
      }
    });
  }
});

test.describe("HD-4 Keyboard focus is visible after F6", () => {
  test(
    "F6 focuses the toast with the focus fill; after a second F6, Tab and Shift+Tab return where focus was",
    { tag: ["@HD-4", "@packaged-only"] },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(4 * 60 * 1000);
      test.skip(browser.browserType().name() !== "chromium", "HD-4 runs in packaged Chromium");
      const a = await newParticipant(browser, "Guest A", testInfo, {
        contextOptions: contextDefaults(baseURL),
      });
      try {
        await startRoom(a);
        await requestRecording(a.page);
        await expect(a.page.getByTestId(RECORDING.control)).toHaveAttribute("data-state", "on");
        await a.page.waitForTimeout(CONTROL_RECORDING_MS);
        await stopRecording(a.page);
        await openLibraryAfterLeaving(a.page);
        await expect(a.page.getByTestId(RECORDING.item)).toHaveCount(1, { timeout: 15_000 });

        // Negative control: with no toast, F6 leaves focus where it was.
        const heading = a.page.getByRole("heading", { level: 1 }).first();
        await heading.focus();
        const before = await a.page.evaluate(
          () => document.activeElement?.outerHTML.slice(0, 80) ?? "",
        );
        await a.page.keyboard.press("F6");
        expect(
          await a.page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) ?? ""),
          "F6 without a toast",
        ).toBe(before);

        await deleteFirstRecording(a.page);
        const toast = a.page.locator(TOAST).first();
        await expect(toast).toBeVisible();
        // The app focuses the page heading after deleting the only recording: the return target.
        const origin = a.page.locator("main h1").first();
        await expect(origin, "the app focused the return target").toBeFocused();
        expect(await activeIsInside(a.page, TOAST), "focus is not on the toast before F6").toBe(
          false,
        );
        const rest = await paintOf(toast);
        const surface = await pageBackground(a.page);
        await a.page.keyboard.press("F6");
        expect(await activeIsInside(a.page, TOAST), "F6 moves focus to the toast").toBe(true);
        const focused = await paintOf(a.page.locator(":focus"));
        const vsRest = contrastRatio(focused.background, rest.background);
        const vsPage = contrastRatio(focused.background, surface);
        const text = contrastRatio(focused.color, focused.background);
        await attachJson(testInfo, "hd-4-focus.json", {
          rest,
          focused,
          surface,
          vsRest,
          vsPage,
          text,
        });
        await attachScreenshot(testInfo, a.page, "hd-4-toast-focused");
        expect(vsRest ?? 0, "focus fill vs resting fill").toBeGreaterThanOrEqual(3);
        expect(vsPage ?? 0, "focus fill vs page").toBeGreaterThanOrEqual(3);
        expect(text ?? 0, "toast text on the focus fill").toBeGreaterThanOrEqual(4.5);

        // (b) F6 again, then Tab; (c) F6, F6, then Shift+Tab. Both go back to the return target.
        for (const key of ["Tab", "Shift+Tab"]) {
          if (key === "Shift+Tab") {
            if (!(await toast.isVisible()))
              throw new Error("BLOCKED: the toast expired before (c)");
            await a.page.keyboard.press("F6");
            expect(await activeIsInside(a.page, TOAST), "(c) F6 focuses the toast").toBe(true);
          }
          await a.page.keyboard.press("F6");
          expect(
            await activeIsInside(a.page, TOAST),
            `a second F6 stays on the toast (${key})`,
          ).toBe(true);
          expect(
            await activeIsInside(a.page, TOAST_VIEWPORT),
            `inside before the first ${key}`,
          ).toBe(true);
          let presses = 0;
          while (presses < MAX_TABS_TO_LEAVE && (await activeIsInside(a.page, TOAST_VIEWPORT))) {
            await a.page.keyboard.press(key);
            presses += 1;
          }
          expect(
            await activeIsInside(a.page, TOAST_VIEWPORT),
            `${key} leaves the toast region`,
          ).toBe(false);
          await expect(origin, `${key} returns to the target`).toBeFocused({ timeout: 1_000 });
        }
      } finally {
        await closeAll([a]);
      }
    },
  );
});
