import { type Browser, expect, type TestInfo, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./evidence.ts";
import { expectOneRemoteWithMedia } from "./media-probes.ts";
import {
  installRecordingRtcWitness,
  verifyDataChannelCanary,
  verifyHttpUploadCanary,
} from "./rc-support-network.ts";
import {
  expectFailureNotice,
  falseSuccessSignals,
  installStartWitness,
  readStartWitness,
  UNAVAILABLE_TEXT,
} from "./rc-support-start.ts";
import {
  answerConsent,
  diskBaselines,
  notRecordingProbe,
  openLibraryAfterLeaving,
  requestRecording,
  waitForSavedRecording,
} from "./wc-recording.ts";
import { closeAll, holdsFor, joinRoom, newParticipant, startRoom } from "./wc-room.ts";
import { readTaps } from "./wc-taps.ts";
import { RECORDING } from "./wc-test-ids.ts";

const CHROMIUM_VERSION = "158.0.8127.18";
const CASE_TAGS = ["@RC-5", "@packaged-only", "@value-critical"];
const CONTROL_TAGS = ["@RC-5", "@packaged-only", "@rc-control"];

async function verifyBrowser(browser: Browser, testInfo: TestInfo): Promise<void> {
  const observed = { engine: browser.browserType().name(), version: browser.version() };
  await attachJson(testInfo, "rc-5-browser.json", { observed, expected: CHROMIUM_VERSION });
  if (observed.engine !== "chromium" || observed.version !== CHROMIUM_VERSION) {
    throw new Error(
      `BLOCKED: RC-5 requires Chromium ${CHROMIUM_VERSION}; observed ${observed.engine} ${observed.version}`,
    );
  }
}

export function registerSupportCases(): void {
  test(
    "RC-5 an unavailable recorder stays inactive and creates no recording",
    { tag: CASE_TAGS },
    async ({ browser }, testInfo) => {
      await verifyBrowser(browser, testInfo);
      const a = await newParticipant(browser, "Guest A", testInfo);
      const b = await newParticipant(browser, "Guest B", testInfo);
      try {
        await installStartWitness(a.context, "unavailable");
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(a.page, "A remains in a usable meeting");
        await expectOneRemoteWithMedia(b.page, "B sees A's meeting media");
        const baselines = await diskBaselines([a, b]);
        const control = a.page.getByTestId(RECORDING.control);
        await expect(control).toHaveAttribute("aria-disabled", "true");
        await control.press("Enter");
        await expect(a.page.locator("p").filter({ hasText: UNAVAILABLE_TEXT })).toBeVisible();
        await holdsFor(a.page, 2_000, "unavailable request stays inactive", async () => {
          if ((await b.page.getByTestId(RECORDING.prompt).count()) !== 0)
            return "B received a consent prompt";
          return notRecordingProbe(baselines);
        });
        await expect(control).toHaveAttribute("data-state", "off");
        await attachScreenshot(testInfo, a.page, "rc-5-unavailable");
        await openLibraryAfterLeaving(a.page);
        await expect(
          a.page.getByRole("heading", { name: "No recordings on this device" }),
        ).toBeVisible();
        const witness = await readStartWitness(a.page);
        const encoder = (await readTaps(a.page)).recorder;
        const outcome = {
          activeIndicatorSeen: witness.activeIndicatorSeen,
          encoderStarts: encoder.started,
          playableOrComplete: (await a.page.getByTestId(RECORDING.item).count()) > 0,
        };
        await attachJson(testInfo, "rc-5-unavailable.json", { witness, encoder, outcome });
        expect(encoder.constructed, "known unavailability never constructs MediaRecorder").toBe(0);
        expect(falseSuccessSignals(outcome)).toEqual([]);
      } finally {
        await closeAll([a, b]);
      }
    },
  );

  test(
    "RC-5 native MediaRecorder start failure clears UI and leaves no playable clip",
    { tag: CASE_TAGS },
    async ({ browser }, testInfo) => {
      await verifyBrowser(browser, testInfo);
      const a = await newParticipant(browser, "Guest A", testInfo);
      const b = await newParticipant(browser, "Guest B", testInfo);
      try {
        await installStartWitness(a.context, "native-start-failure");
        await installStartWitness(b.context, "observe");
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(a.page, "A receives meeting media before the failed start");
        const [baseline] = await diskBaselines([a]);
        const control = a.page.getByTestId(RECORDING.control);
        await expect(control).toBeEnabled();
        await requestRecording(a.page);
        const consentAt = Date.now();
        await answerConsent(b.page, true);
        await expectFailureNotice(a.page, testInfo);
        await expect(control).toHaveAttribute("data-state", "off");
        await expect(a.page.getByTestId(RECORDING.indicator)).toHaveCount(0);
        await expect(b.page.getByTestId(RECORDING.indicator)).toHaveCount(0);
        await expectOneRemoteWithMedia(b.page, "B still receives A's meeting media after failure");
        await attachScreenshot(testInfo, a.page, "rc-5-native-start-failure");
        await openLibraryAfterLeaving(a.page);
        const files = await waitForSavedRecording(a.page, consentAt, baseline?.files ?? []);
        const item = a.page.getByTestId(RECORDING.item);
        const hasFailure = await item.getByText("Recording failed", { exact: true }).isVisible();
        await item.click();
        await expect(
          a.page.getByText(/Recording failed and there is no playable clip/),
        ).toBeVisible();
        const witness = await readStartWitness(a.page);
        const peerWitness = await readStartWitness(b.page);
        const encoder = (await readTaps(a.page)).recorder;
        const outcome = {
          activeIndicatorSeen: witness.activeIndicatorSeen || peerWitness.activeIndicatorSeen,
          encoderStarts: encoder.started,
          playableOrComplete:
            !hasFailure || (await a.page.getByTestId(RECORDING.play).count()) !== 0,
        };
        await attachJson(testInfo, "rc-5-native-start-failure.json", {
          witness,
          peerWitness,
          encoder,
          files,
          outcome,
        });
        expect(encoder.constructed).toBe(1);
        expect(encoder.bytes).toBe(0);
        expect(
          files.every(({ size }) => size === 0),
          "no OPFS recording bytes were written",
        ).toBe(true);
        expect(falseSuccessSignals(outcome)).toEqual([]);
      } finally {
        await closeAll([a, b]);
      }
    },
  );

  test(
    "RC-5 the local-only oracle detects intercepted HTTP and disposable RTC uploads",
    { tag: CONTROL_TAGS },
    async ({ browser }, testInfo) => {
      await verifyBrowser(browser, testInfo);
      const participant = await newParticipant(browser, "Guest Canary", testInfo);
      try {
        await installRecordingRtcWitness(participant.context);
        await verifyHttpUploadCanary(participant, testInfo, "rc-5-http-canary.json");
        await verifyDataChannelCanary(participant.page, testInfo);
      } finally {
        await closeAll([participant]);
      }
    },
  );

  test(
    "RC-5 the start oracle rejects false active and complete outcomes",
    { tag: CONTROL_TAGS },
    async ({ browser }, testInfo) => {
      await verifyBrowser(browser, testInfo);
      const unavailableShownActive = {
        activeIndicatorSeen: true,
        encoderStarts: 0,
        playableOrComplete: false,
      };
      const failedStartShownComplete = {
        activeIndicatorSeen: false,
        encoderStarts: 0,
        playableOrComplete: true,
      };
      const rejected = {
        active: falseSuccessSignals(unavailableShownActive),
        complete: falseSuccessSignals(failedStartShownComplete),
      };
      await attachJson(testInfo, "rc-5-start-oracle-canary.json", rejected);
      expect(rejected.active).toEqual(["active indicator"]);
      expect(rejected.complete).toEqual(["playable or complete library result"]);
    },
  );
}
