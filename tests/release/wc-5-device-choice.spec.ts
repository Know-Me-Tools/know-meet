/**
 * WC-5 Chosen microphone and camera are the ones used
 * (features/wc-5-device-choice.feature). Packaged then hosted, Chromium with
 * three fake devices per kind (src/browser-args.ts MULTI_DEVICE_ARGS).
 *
 * The active device is the deviceId of the newest live getUserMedia track, read
 * by the page tap (wc-taps.ts); it does not trust the select the app renders.
 * The lobby offers microphone and camera only; the room device selects are in
 * the Settings sheet ("Audio and video"). The lobby meter's value is
 * aria-valuenow, 0 to 100.
 * ASSUMPTION: a select option's value is the device's deviceId.
 */
import { chromium, expect, test } from "@playwright/test";
import { MULTI_DEVICE_ARGS } from "./src/browser-args.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia, observeAudio, remoteTiles } from "./src/media-probes.ts";
import { LOBBY } from "./src/test-ids.ts";
import { openRoomSettings, otherThan, readSelect } from "./src/wc-devices.ts";
import {
  closeAll,
  contextDefaults,
  finishJoin,
  joinRoom,
  newParticipant,
  openLobbyForNewMeeting,
} from "./src/wc-room.ts";
import { activeDeviceId, defaultGroupId, groupIdOf } from "./src/wc-taps.ts";
import { DEVICES, LEVEL_ATTRIBUTE } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 6 * 60 * 1000;
const LEVEL_WINDOW_MS = 15_000;

test.describe("WC-5 Chosen microphone and camera are the ones used", () => {
  test(
    "the lobby shows level and preview; lobby choices are active after join; switching in the room switches the device",
    { tag: ["@WC-5", "@value-critical", "@smoke"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const browser = await chromium.launch({ args: [...MULTI_DEVICE_ARGS] });
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      try {
        const { code } = await openLobbyForNewMeeting(a.page);

        // Lobby: devices listed, preview rendering, level moving.
        const mics = await readSelect(a.page, DEVICES.lobbyMicSelect);
        const cameras = await readSelect(a.page, DEVICES.lobbyCameraSelect);
        const chosenMic = otherThan(mics, [mics.selected], "microphone");
        const chosenCamera = otherThan(cameras, [cameras.selected], "camera");
        await expect
          .poll(
            () =>
              a.page
                .getByTestId(LOBBY.cameraPreview)
                .evaluate((el) => (el as HTMLVideoElement).videoWidth),
            { message: "lobby preview renders a picture" },
          )
          .toBeGreaterThan(0);
        const levels = new Set<string>();
        await expect
          .poll(
            async () => {
              levels.add(
                (await a.page.getByTestId(DEVICES.lobbyMicLevel).getAttribute(LEVEL_ATTRIBUTE)) ??
                  "",
              );
              return levels.size;
            },
            { message: "lobby level meter moves", timeout: LEVEL_WINDOW_MS, intervals: [250] },
          )
          .toBeGreaterThan(1);
        expect(Math.max(...[...levels].map(Number)), "level rises above silence").toBeGreaterThan(
          0,
        );
        await attachScreenshot(testInfo, a.page, "wc-5-lobby");

        await a.page.getByTestId(DEVICES.lobbyMicSelect).selectOption(chosenMic);
        await a.page.getByTestId(DEVICES.lobbyCameraSelect).selectOption(chosenCamera);
        await finishJoin(a.page, a.name, code, { mic: true, camera: true });
        await joinRoom(b, code);

        await expect
          .poll(() => activeDeviceId(a.page, "audio"), {
            message: "active microphone is the lobby choice",
          })
          .toBe(chosenMic);
        await expect
          .poll(() => activeDeviceId(a.page, "video"), {
            message: "active camera is the lobby choice",
          })
          .toBe(chosenCamera);

        // In the room: switch the microphone; the active device id changes and B keeps receiving.
        await openRoomSettings(a.page);
        const roomMics = await readSelect(a.page, DEVICES.roomMicSelect);
        const switchedMic = otherThan(roomMics, [chosenMic], "microphone (room)");
        await a.page.getByTestId(DEVICES.roomMicSelect).selectOption(switchedMic);
        await expect
          .poll(() => activeDeviceId(a.page, "audio"), {
            message: "active microphone after switching",
          })
          .toBe(switchedMic);
        await expectOneRemoteWithMedia(b.page, "context B after A switched microphone");
        await expect
          .poll(async () => (await observeAudio(remoteTiles(b.page).first())).liveAudioTrack)
          .toBe(true);
        await attachJson(testInfo, "wc-5-devices.json", {
          roomCode: code,
          mics: mics.values,
          cameras: cameras.values,
          chosenMic,
          chosenCamera,
          switchedMic,
        });
        await attachScreenshot(testInfo, a.page, "wc-5-room-settings");
      } finally {
        await closeAll([a, b]);
        await browser.close();
      }
    },
  );

  test(
    "without a choice the default device is active",
    { tag: ["@WC-5", "@negative-control"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const browser = await chromium.launch({ args: [...MULTI_DEVICE_ARGS] });
      const a = await newParticipant(browser, "Guest A", testInfo, {
        contextOptions: contextDefaults(baseURL),
      });
      try {
        const { code } = await openLobbyForNewMeeting(a.page);
        await finishJoin(a.page, a.name, code, { mic: true, camera: true });
        const defaultMicGroup = await defaultGroupId(a.page, "audioinput");
        const defaultCameraGroup = await defaultGroupId(a.page, "videoinput");
        // An empty group id would let the comparison below pass for any device.
        expect(defaultMicGroup, "default microphone has a group id").not.toBe("");
        expect(defaultCameraGroup, "default camera has a group id").not.toBe("");
        await expect
          .poll(
            async () => {
              const id = await activeDeviceId(a.page, "audio");
              return id === null ? "" : groupIdOf(a.page, id);
            },
            { message: "active microphone belongs to the default device" },
          )
          .toBe(defaultMicGroup);
        await expect
          .poll(
            async () => {
              const id = await activeDeviceId(a.page, "video");
              return id === null ? "" : groupIdOf(a.page, id);
            },
            { message: "active camera belongs to the default device" },
          )
          .toBe(defaultCameraGroup);
      } finally {
        await closeAll([a]);
        await browser.close();
      }
    },
  );
});
