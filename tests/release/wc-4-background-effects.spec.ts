/**
 * WC-4 Blur and image backgrounds show remotely and turn off cleanly
 * (features/wc-4-background-effects.feature). Packaged then hosted, Chromium.
 *
 * Observations:
 *   - A's local tile reports its processor (EFFECTS.processorAttribute), derived by the app
 *     from the port's backgroundEffect snapshot, which the adapter sets to "active" only
 *     after the processor is applied to the published track: the product's claim.
 *   - B's rendered video frame changes and loses detail (wc-frames.ts): the independent
 *     witness. The attribute alone never passes WC-4; every effect step also requires
 *     B's frame to differ from the pre-effect frame by more than the untouched-stream
 *     noise (second test), and off requires it to return.
 *   - No .wasm or model file is requested from another origin, and no CSP
 *     violation is reported (wc-network.ts): the CSP half of the contract.
 * Visual quality of the composite is a judgement from the attached frames.
 */
import { writeFileSync } from "node:fs";
import { chromium, expect, type Page, test } from "@playwright/test";
import { cameraFileArg, FAKE_MEDIA_ARGS } from "./src/browser-args.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia, observeVideo, remoteTiles } from "./src/media-probes.ts";
import { ROOM } from "./src/test-ids.ts";
import { openRoomSettings } from "./src/wc-devices.ts";
import { edgeEnergy, frameDifference, snapshotFrame } from "./src/wc-frames.ts";
import { assetRequests, crossOriginAssets, summarise } from "./src/wc-network.ts";
import { closeAll, contextDefaults, joinRoom, newParticipant, startRoom } from "./src/wc-room.ts";
import { EFFECTS } from "./src/wc-test-ids.ts";
import { buildY4m } from "./src/y4m.ts";

const TEST_TIMEOUT_MS = 6 * 60 * 1000;
/** Mean luma change (0 to 255) that counts as "the picture moved". The y4m stripes make blur large. */
const MOVED_MIN = 6;
const EFFECT_SETTLE_MS = 30_000;
const MODEL_EXTENSIONS: readonly string[] = [".tflite", ".task", ".binarypb"];

async function processor(page: Page): Promise<string | null> {
  return page.getByTestId(ROOM.localTile).getAttribute(EFFECTS.processorAttribute);
}

async function expectProcessor(page: Page, expected: string, label: string): Promise<void> {
  await expect
    .poll(() => processor(page), { message: label, timeout: EFFECT_SETTLE_MS })
    .toBe(expected);
}

test.describe("WC-4 Blur and image backgrounds show remotely and turn off cleanly", () => {
  test(
    "blur, image and off are visible on B; no off-origin wasm or model and no CSP violation",
    { tag: ["@WC-4", "@value-critical", "@smoke"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const cameraFile = testInfo.outputPath("wc-4-camera.y4m");
      writeFileSync(cameraFile, buildY4m());
      const browser = await chromium.launch({
        args: [...FAKE_MEDIA_ARGS, cameraFileArg(cameraFile)],
      });
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(b.page, "context B");
        const remoteVideo = remoteTiles(b.page).first().getByTestId(ROOM.remoteVideo);

        // Negative control, in the run: before any effect the track reports no processor.
        await expectProcessor(a.page, "none", "A before any effect");
        await snapshotFrame(remoteVideo, "original");
        const originalEdges = await edgeEnergy(b.page, "original");
        await attachScreenshot(testInfo, b.page, "wc-4-b-original");

        // The Background section is in the Settings sheet and stays open between choices.
        await openRoomSettings(a.page);
        await expect(a.page.getByRole("radiogroup", { name: EFFECTS.groupName })).toBeVisible();
        await a.page.getByTestId(EFFECTS.blur).click();
        await expectProcessor(a.page, "background-blur", "A after blur");
        await expect
          .poll(
            async () => {
              await snapshotFrame(remoteVideo, "blur");
              return frameDifference(b.page, "original", "blur");
            },
            {
              message: "B's frame differs from the pre-effect frame after blur",
              timeout: EFFECT_SETTLE_MS,
            },
          )
          .toBeGreaterThan(MOVED_MIN);
        const blurEdges = await edgeEnergy(b.page, "blur");
        expect(blurEdges, "blur removes fine detail").toBeLessThan(originalEdges * 0.6);
        await attachScreenshot(testInfo, b.page, "wc-4-b-blur");

        await a.page.getByTestId(EFFECTS.imageOption).first().click();
        await expectProcessor(a.page, "virtual-background", "A after image background");
        await expect
          .poll(
            async () => {
              await snapshotFrame(remoteVideo, "image");
              return frameDifference(b.page, "original", "image");
            },
            {
              message: "B's frame differs from the pre-effect frame after image",
              timeout: EFFECT_SETTLE_MS,
            },
          )
          .toBeGreaterThan(MOVED_MIN);
        await attachScreenshot(testInfo, b.page, "wc-4-b-image");

        await a.page.getByTestId(EFFECTS.off).click();
        await expectProcessor(a.page, "none", "A after turning effects off");
        const blurMove = await frameDifference(b.page, "original", "blur");
        await expect
          .poll(
            async () => {
              await snapshotFrame(remoteVideo, "off");
              return frameDifference(b.page, "original", "off");
            },
            {
              message: "B's frame returns toward the original after off",
              timeout: EFFECT_SETTLE_MS,
            },
          )
          .toBeLessThan(blurMove / 2);
        const stillRendering = await observeVideo(remoteTiles(b.page).first());
        expect(
          stillRendering.liveVideoTrack && stillRendering.videoWidth > 0,
          "B still renders A",
        ).toBe(true);
        await attachScreenshot(testInfo, b.page, "wc-4-b-off");

        const origin = new URL(baseURL ?? "").origin;
        for (const p of [a, b]) {
          const snapshot = await p.net.collect();
          await attachJson(testInfo, `wc-4-${p.name}-network.json`, summarise(snapshot));
          const off = crossOriginAssets(snapshot, origin, [".wasm", ...MODEL_EXTENSIONS]);
          expect(off, `${p.name}: wasm or model requested from another origin`).toEqual([]);
          expect(snapshot.cspViolations, `${p.name}: CSP violations`).toEqual([]);
          expect(snapshot.cspConsole, `${p.name}: CSP console messages`).toEqual([]);
          if (p === a) {
            // Non-vacuity: the processor really loaded its files, from this origin.
            expect(assetRequests(snapshot, ".wasm").length, "A requested a .wasm").toBeGreaterThan(
              0,
            );
            const models = MODEL_EXTENSIONS.flatMap((ext) => assetRequests(snapshot, ext));
            expect(models.length, "A requested a segmentation model").toBeGreaterThan(0);
          }
        }
      } finally {
        await closeAll([a, b]);
        await browser.close();
      }
    },
  );

  test(
    "with effects never turned on, A's track reports no processor and B sees the original frame",
    { tag: ["@WC-4", "@negative-control"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const cameraFile = testInfo.outputPath("wc-4-camera-control.y4m");
      writeFileSync(cameraFile, buildY4m());
      const browser = await chromium.launch({
        args: [...FAKE_MEDIA_ARGS, cameraFileArg(cameraFile)],
      });
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(b.page, "context B");
        const remoteVideo = remoteTiles(b.page).first().getByTestId(ROOM.remoteVideo);
        await expectProcessor(a.page, "none", "A with effects untouched");
        // Two captures of the untouched stream bound the noise a real effect must exceed.
        await snapshotFrame(remoteVideo, "first");
        await snapshotFrame(remoteVideo, "second");
        const noise = await frameDifference(b.page, "first", "second");
        await attachJson(testInfo, "wc-4-negative.json", { noise, threshold: MOVED_MIN });
        expect(
          noise,
          "frame noise of the untouched stream stays below the effect threshold",
        ).toBeLessThan(MOVED_MIN);
      } finally {
        await closeAll([a, b]);
        await browser.close();
      }
    },
  );
});
