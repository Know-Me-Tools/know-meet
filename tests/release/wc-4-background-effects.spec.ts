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
 *
 * Two paths (amendment 4, repair 9):
 *   - GPU: headed Chromium with hardware WebGL. The section prepares the processor while
 *     shown; after it reports ready, A's page must answer a 50 ms heartbeat with no gap over
 *     2 s after each choice. A software renderer here is BLOCKED, not a pass.
 *   - Software: headless Chromium (SwiftShader). Effects are reported not available, no
 *     processor is attached, and the meeting stays responsive (mute answers within 2 s).
 */
import { writeFileSync } from "node:fs";
import { chromium, expect, type Page, test } from "@playwright/test";
import { cameraFileArg, FAKE_MEDIA_ARGS } from "./src/browser-args.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia, observeVideo, remoteTiles } from "./src/media-probes.ts";
import { DATA_STATE, ROOM } from "./src/test-ids.ts";
import { openRoomSettings } from "./src/wc-devices.ts";
import { edgeEnergy, frameDifference, snapshotFrame } from "./src/wc-frames.ts";
import { assetRequests, crossOriginAssets, summarise } from "./src/wc-network.ts";
import { closeAll, contextDefaults, joinRoom, newParticipant, startRoom } from "./src/wc-room.ts";
import { DEVICES, EFFECTS } from "./src/wc-test-ids.ts";
import { buildY4m } from "./src/y4m.ts";

const TEST_TIMEOUT_MS = 6 * 60 * 1000;
/** Mean luma change (0 to 255) that counts as "the picture moved". The y4m stripes make blur large. */
const MOVED_MIN = 6;
const EFFECT_SETTLE_MS = 30_000;
const MODEL_EXTENSIONS: readonly string[] = [".tflite", ".task", ".binarypb"];
/** Longest main-thread stall allowed after a choice once the section is ready, ms. */
const RESPONSIVE_MAX_GAP_MS = 2000;
/** How long the section may take to prepare the processor (cold GPU build measured 6.5 s). */
const PREPARE_TIMEOUT_MS = 30_000;
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

/** The WebGL renderer A's page gets, recorded as evidence for the path. */
async function webglRenderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "no webgl2";
  });
}

/** Starts a 50 ms heartbeat in the page; read the longest gap since a mark with heartbeatGap. */
async function startHeartbeat(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __kmBeats?: number[] };
    if (w.__kmBeats !== undefined) return;
    const beats: number[] = [];
    w.__kmBeats = beats;
    setInterval(() => beats.push(performance.now()), 50);
  });
}

async function heartbeatMark(page: Page): Promise<number> {
  return page.evaluate(() => performance.now());
}

/** Longest gap between heartbeats (or to now) since `mark`, ms. */
async function heartbeatGap(page: Page, mark: number): Promise<number> {
  return page.evaluate((since) => {
    const w = window as unknown as { __kmBeats?: number[] };
    const beats = [since, ...(w.__kmBeats ?? []).filter((t) => t > since), performance.now()];
    let gap = 0;
    for (let i = 1; i < beats.length; i++) gap = Math.max(gap, beats[i] - beats[i - 1]);
    return Math.round(gap);
  }, mark);
}

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
      // GPU path: headed, so Chromium uses the machine's GPU for WebGL.
      const browser = await chromium.launch({
        headless: false,
        args: [...FAKE_MEDIA_ARGS, cameraFileArg(cameraFile)],
      });
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      const gaps: Record<string, number> = {};
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(b.page, "context B");
        const remoteVideo = remoteTiles(b.page).first().getByTestId(ROOM.remoteVideo);
        const renderer = await webglRenderer(a.page);
        await attachJson(testInfo, "wc-4-gpu-renderer.json", { renderer });
        if (SOFTWARE_RENDERER.test(renderer) || renderer === "no webgl2") {
          throw new Error(`BLOCKED: the GPU path got a software renderer (${renderer})`);
        }
        await startHeartbeat(a.page);

        // Negative control, in the run: before any effect the track reports no processor.
        await expectProcessor(a.page, "none", "A before any effect");
        await snapshotFrame(remoteVideo, "original");
        const originalEdges = await edgeEnergy(b.page, "original");
        await attachScreenshot(testInfo, b.page, "wc-4-b-original");

        // The Background section is in the Settings sheet and stays open between choices.
        await openRoomSettings(a.page);
        await expect(a.page.getByRole("radiogroup", { name: EFFECTS.groupName })).toBeVisible();
        // The section prepares the processor while shown; wait until it says it is ready.
        await expect(a.page.getByTestId(EFFECTS.status)).not.toHaveAttribute(
          "data-state",
          "preparing",
          { timeout: PREPARE_TIMEOUT_MS },
        );
        let mark = await heartbeatMark(a.page);
        await a.page.getByTestId(EFFECTS.blur).click();
        await expectProcessor(a.page, "background-blur", "A after blur");
        gaps["blur"] = await heartbeatGap(a.page, mark);
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

        mark = await heartbeatMark(a.page);
        await a.page.getByTestId(EFFECTS.imageOption).first().click();
        await expectProcessor(a.page, "virtual-background", "A after image background");
        gaps["image"] = await heartbeatGap(a.page, mark);
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

        mark = await heartbeatMark(a.page);
        await a.page.getByTestId(EFFECTS.off).click();
        await expectProcessor(a.page, "none", "A after turning effects off");
        gaps["off"] = await heartbeatGap(a.page, mark);
        await attachJson(testInfo, "wc-4-main-thread-gaps.json", {
          gaps,
          maxAllowedMs: RESPONSIVE_MAX_GAP_MS,
        });
        for (const [step, gap] of Object.entries(gaps)) {
          expect(gap, `A's page answers within 2 s after ${step}`).toBeLessThanOrEqual(
            RESPONSIVE_MAX_GAP_MS,
          );
        }
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
    "software graphics: effects are reported not available and the meeting stays responsive",
    { tag: ["@WC-4", "@value-critical"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const cameraFile = testInfo.outputPath("wc-4-camera-software.y4m");
      writeFileSync(cameraFile, buildY4m());
      // Software path: headless, as the rest of the suite runs (SwiftShader WebGL).
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
        const renderer = await webglRenderer(a.page);
        await attachJson(testInfo, "wc-4-software-renderer.json", { renderer });
        expect(
          SOFTWARE_RENDERER.test(renderer) || renderer === "no webgl2",
          `the software path runs on software WebGL (${renderer})`,
        ).toBe(true);

        await openRoomSettings(a.page);
        await expect(a.page.getByTestId(EFFECTS.unavailable)).toBeVisible();
        await expect(a.page.getByTestId(EFFECTS.unavailable)).toContainText(
          "not available on this device",
        );
        await expect(a.page.getByRole("radiogroup", { name: EFFECTS.groupName })).toHaveCount(0);
        await expect(a.page.getByTestId(EFFECTS.blur)).toHaveCount(0);
        await attachScreenshot(testInfo, a.page, "wc-4-a-unavailable");
        await expectProcessor(a.page, "none", "A on software graphics");

        const settings = a.page.getByTestId(DEVICES.roomSettings);
        if ((await settings.getAttribute("aria-expanded")) === "true") await settings.click();
        const mute = a.page.getByTestId(ROOM.muteMic);
        const before = await mute.getAttribute(DATA_STATE);
        const clicked = Date.now();
        await mute.click();
        await expect(mute).not.toHaveAttribute(DATA_STATE, before ?? "", { timeout: 2000 });
        await attachJson(testInfo, "wc-4-software-mute.json", {
          before,
          answeredMs: Date.now() - clicked,
        });
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
