/**
 * WC-6 Speaker choice works where supported and is explained where not
 * (features/wc-6-speaker.feature). Packaged, Chromium for selection (three fake
 * devices), and Chromium, Firefox and WebKit (@cross-engine) for the
 * explanation path with setSinkId removed by an init script.
 *
 * Speaker choice is room-only (shapes/device-settings.md): the control and the
 * explanation live in the Settings sheet, not in the lobby.
 *
 * Active output = the sinkId of the remote <audio> element, read from the
 * browser. ASSUMPTION: option value = deviceId; Chromium's fake device set
 * offers at least two audio outputs. If it does not, the run is BLOCKED.
 */
import { chromium, expect, test } from "@playwright/test";
import { MULTI_DEVICE_ARGS } from "./src/browser-args.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { ROOM } from "./src/test-ids.ts";
import { openRoomSettings, otherThan, readSelect } from "./src/wc-devices.ts";
import {
  closeAll,
  contextDefaults,
  expectRemoteCount,
  finishJoin,
  joinRoom,
  mediaFor,
  newParticipant,
  openLobbyForNewMeeting,
} from "./src/wc-room.ts";
import { DEVICES } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 5 * 60 * 1000;

/** Removes the output-selection API before any page script runs (the unsupported path). */
const REMOVE_SET_SINK_ID = `(() => {
  for (const proto of [HTMLMediaElement.prototype, typeof AudioContext === "undefined" ? null : AudioContext.prototype]) {
    if (proto && "setSinkId" in proto) delete proto.setSinkId;
  }
})();`;

test.describe("WC-6 Speaker choice works where supported and is explained where not", () => {
  test(
    "where setSinkId exists, choosing an output changes the remote audio element's sink and no explanation shows",
    { tag: ["@WC-6", "@value-critical", "@smoke"] },
    async ({ baseURL }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const browser = await chromium.launch({ args: [...MULTI_DEVICE_ARGS] });
      const contextOptions = contextDefaults(baseURL);
      const a = await newParticipant(browser, "Guest A", testInfo, { contextOptions });
      const b = await newParticipant(browser, "Guest B", testInfo, { contextOptions });
      try {
        const { code } = await openLobbyForNewMeeting(a.page);
        await finishJoin(a.page, a.name, code, { mic: true, camera: true });
        await joinRoom(b, code);
        await expectRemoteCount(b.page, 1, "B: remote tiles");

        // Negative control, in the run: with setSinkId present, the speaker select is offered
        // in the room settings and no explanation is shown. Speaker choice is room-only.
        await openRoomSettings(a.page);
        await expect(a.page.getByTestId(DEVICES.roomSpeakerSelect)).toBeVisible();
        await expect(a.page.getByTestId(DEVICES.speakerUnsupported)).toHaveCount(0);

        await openRoomSettings(b.page);
        const outputs = await readSelect(b.page, DEVICES.roomSpeakerSelect);
        const chosen = otherThan(outputs, [outputs.selected], "audio output");
        const sinkBefore = await b.page
          .getByTestId(ROOM.remoteAudio)
          .first()
          .evaluate((el) => (el as HTMLAudioElement & { sinkId: string }).sinkId);
        await b.page.getByTestId(DEVICES.roomSpeakerSelect).selectOption(chosen);
        await expect
          .poll(
            () =>
              b.page
                .getByTestId(ROOM.remoteAudio)
                .first()
                .evaluate((el) => (el as HTMLAudioElement & { sinkId: string }).sinkId),
            { message: "remote audio element plays through the chosen output" },
          )
          .toBe(chosen);
        await expect(b.page.getByTestId(DEVICES.speakerUnsupported)).toHaveCount(0);
        await attachJson(testInfo, "wc-6-supported.json", {
          outputs: outputs.values,
          sinkBefore,
          chosen,
        });
        await attachScreenshot(testInfo, b.page, "wc-6-supported");
      } finally {
        await closeAll([a, b]);
        await browser.close();
      }
    },
  );

  test(
    "where setSinkId is absent, the speaker control is not offered and an announced explanation is visible",
    { tag: ["@WC-6", "@value-critical", "@cross-engine"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const a = await newParticipant(browser, "Guest A", testInfo);
      try {
        await a.context.addInitScript({ content: REMOVE_SET_SINK_ID });
        const { code: roomCode } = await openLobbyForNewMeeting(a.page);
        const hasApi = await a.page.evaluate("'setSinkId' in HTMLMediaElement.prototype");
        expect(hasApi, "precondition: setSinkId is removed in this page").toBe(false);

        // Speaker choice is room-only: the lobby offers no speaker select either way.
        await finishJoin(a.page, a.name, roomCode, mediaFor(browser));
        await openRoomSettings(a.page);
        await expect(a.page.getByTestId(DEVICES.roomSpeakerSelect)).toHaveCount(0);
        const note = a.page.getByTestId(DEVICES.speakerUnsupported);
        await expect(note, "explanation is visible in the room settings").toBeVisible();
        await expect(note).toHaveText(/\S/);

        // Announced: a status or alert role, or an aria-live region, so a screen reader hears it.
        const role = await note.getAttribute("role");
        const live = await note.getAttribute("aria-live");
        expect(
          role === "status" || role === "alert" || live === "polite" || live === "assertive",
          `explanation is announced (role=${role}, aria-live=${live})`,
        ).toBe(true);
        await attachScreenshot(testInfo, a.page, "wc-6-unsupported-room");
        await attachJson(testInfo, "wc-6-unsupported.json", { roomCode, role, live });
      } finally {
        await closeAll([a]);
      }
    },
  );
});
