/**
 * WC-1 Screen share reaches the other participant and stops cleanly
 * (features/wc-1-screen-share.feature). Packaged then hosted, Chromium.
 * Real collaborators: LiveKit Cloud, the token service, the web image, Chromium
 * with fake media and an auto-selected screen capture source (src/browser-args.ts).
 * Boundary-only (VLBV): never run per change.
 */
import { expect, type Page, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia, observeVideo, remoteTiles } from "./src/media-probes.ts";
import { DATA_STATE } from "./src/test-ids.ts";
import {
  closeAll,
  countProbe,
  holdsFor,
  joinRoom,
  newParticipant,
  type Participant,
  startRoom,
} from "./src/wc-room.ts";
import { SHARE, SHARE_SOURCE } from "./src/wc-test-ids.ts";

const STOP_WITHIN_MS = 10_000;
const NEGATIVE_WINDOW_MS = 5_000;
const TEST_TIMEOUT_MS = 5 * 60 * 1000;

interface ShareObservation {
  readonly tiles: number;
  readonly source: string | null;
  readonly liveVideoTrack: boolean;
  readonly videoWidth: number;
  readonly videoHeight: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
}

/** What the page renders for screen shares: count, track source, decoded size, box size. */
async function observeShare(page: Page): Promise<ShareObservation> {
  const tiles = await page.getByTestId(SHARE.tile).count();
  const empty = {
    tiles,
    source: null,
    liveVideoTrack: false,
    videoWidth: 0,
    videoHeight: 0,
    boxWidth: 0,
    boxHeight: 0,
  };
  if (tiles === 0) return empty;
  const video = page.getByTestId(SHARE.tile).first().getByTestId(SHARE.video);
  return video.evaluate((element) => {
    const el = element as HTMLVideoElement;
    const stream = el.srcObject;
    const box = el.getBoundingClientRect();
    return {
      tiles: 1,
      source: el.getAttribute("data-track-source"),
      liveVideoTrack:
        stream instanceof MediaStream &&
        stream.getVideoTracks().some((track) => track.readyState === "live"),
      videoWidth: el.videoWidth,
      videoHeight: el.videoHeight,
      boxWidth: box.width,
      boxHeight: box.height,
    };
  });
}

function rendersScreenShare(o: ShareObservation): boolean {
  return (
    o.tiles === 1 &&
    o.source === SHARE_SOURCE &&
    o.liveVideoTrack &&
    o.videoWidth > 0 &&
    o.videoHeight > 0 &&
    o.boxWidth > 0 &&
    o.boxHeight > 0
  );
}

async function twoInRoom(
  browser: Parameters<typeof newParticipant>[0],
  testInfo: Parameters<typeof newParticipant>[2],
): Promise<{ a: Participant; b: Participant; code: string }> {
  const a = await newParticipant(browser, "Guest A", testInfo);
  const b = await newParticipant(browser, "Guest B", testInfo);
  const code = await startRoom(a);
  await joinRoom(b, code);
  await expectOneRemoteWithMedia(a.page, "context A");
  await expectOneRemoteWithMedia(b.page, "context B");
  return { a, b, code };
}

test.describe("WC-1 Screen share reaches the other participant and stops cleanly", () => {
  test(
    "B sees A's screen share with rendered size, and it is gone within 10 s of A stopping",
    { tag: ["@WC-1", "@value-critical", "@smoke"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const { a, b, code } = await twoInRoom(browser, testInfo);
      try {
        const control = a.page.getByTestId(SHARE.control);
        // Precondition: nothing shared yet, so a later share tile is a change.
        await expect(control).toHaveAttribute(DATA_STATE, "off");
        expect((await observeShare(b.page)).tiles, "B before A shares").toBe(0);

        await control.click();
        await expect(control, "A's share control after start").toHaveAttribute(DATA_STATE, "on");
        await expect
          .poll(async () => rendersScreenShare(await observeShare(b.page)), {
            message: "B: subscribed ScreenShare track rendered larger than zero",
            timeout: 30_000,
          })
          .toBe(true);
        const seen = await observeShare(b.page);
        await attachJson(testInfo, "wc-1-share-observed-by-b.json", { roomCode: code, seen });
        await attachScreenshot(testInfo, b.page, "wc-1-b-sees-share");
        await attachScreenshot(testInfo, a.page, "wc-1-a-sharing");

        await control.click();
        await expect(control, "A's share control after stop").toHaveAttribute(DATA_STATE, "off", {
          timeout: STOP_WITHIN_MS,
        });
        await expect
          .poll(async () => (await observeShare(b.page)).tiles, {
            message: "B: no ScreenShare track within 10 s of A stopping",
            timeout: STOP_WITHIN_MS,
          })
          .toBe(0);
        // Clean stop: A's camera is still delivered to B.
        const camera = await observeVideo(remoteTiles(b.page).first());
        expect(camera.liveVideoTrack, "B still receives A's camera").toBe(true);
        await attachScreenshot(testInfo, b.page, "wc-1-b-after-stop");
      } finally {
        await closeAll([a, b]);
      }
    },
  );

  test(
    "without starting a share, B reports no ScreenShare track",
    { tag: ["@WC-1", "@negative-control"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const { a, b } = await twoInRoom(browser, testInfo);
      try {
        // Live room, subscribed camera: the observation window below is not vacuous.
        await holdsFor(b.page, NEGATIVE_WINDOW_MS, "B reports no share tile", () =>
          countProbe(b.page, SHARE.tile, 0),
        );
        await expect(a.page.getByTestId(SHARE.control)).toHaveAttribute(DATA_STATE, "off");
        await attachScreenshot(testInfo, b.page, "wc-1-negative-b-no-share");
      } finally {
        await closeAll([a, b]);
      }
    },
  );
});
