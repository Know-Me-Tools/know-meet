/**
 * WC-9 A declined consent means no recording
 * (features/wc-9-consent-declined.feature). Packaged, Chromium.
 *
 * Negative controls (task 1.2), each able to fail:
 *   - decline: nothing records for 20 s after B declines. Fails if recording
 *     starts on request, starts on any answer, or the indicator appears. Three
 *     witnesses: indicator, MediaRecorder starts (page tap), new OPFS files.
 *   - positive counterpart in the same run: A asks again, B agrees, and a
 *     recording does start. Fails if the fixture cannot record at all, so a pass
 *     of the decline window cannot be vacuous.
 *   - late joiner declines (decision D2): the running recording stops for
 *     everyone and keeps what was written. Fails if a late decline is ignored.
 *   - late joiner agrees: the recording keeps running. Fails if any join stops
 *     it, so the previous control cannot pass by "joining always stops".
 * ASSUMPTION: the library is opened from the home screen after leaving the room.
 */
import { expect, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia } from "./src/media-probes.ts";
import {
  answerConsent,
  diskBaselines,
  expectIndicator,
  notRecordingProbe,
  openLibraryAfterLeaving,
  RECORD_WINDOW_MS,
  readLibrary,
  requestRecording,
  stopRecording,
} from "./src/wc-recording.ts";
import {
  closeAll,
  expectRemoteCount,
  holdsFor,
  joinRoom,
  newParticipant,
  type Participant,
  startRoom,
} from "./src/wc-room.ts";
import { opfsEntries, readTaps } from "./src/wc-taps.ts";
import { RECORDING } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 6 * 60 * 1000;
const SETTLE_MS = 10_000;
const COUNTERPART_RUN_MS = 5_000;

async function indicatorsEverywhere(
  participants: readonly Participant[],
  visible: boolean,
): Promise<void> {
  for (const p of participants) {
    await expectIndicator(p.page, visible, `${p.name}: indicator ${visible ? "shown" : "absent"}`);
  }
}

/** A running recording by A with B's consent, indicators up on both. */
async function runningRecording(a: Participant, b: Participant): Promise<void> {
  await requestRecording(a.page);
  await answerConsent(b.page, true);
  await indicatorsEverywhere([a, b], true);
}

test.describe("WC-9 A declined consent means no recording", () => {
  test(
    "B declines: A is told, nothing records for 20 s; then a consented request in the same run does record",
    { tag: ["@WC-9", "@value-critical", "@smoke"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const a = await newParticipant(browser, "Guest A", testInfo);
      const b = await newParticipant(browser, "Guest B", testInfo);
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await expectOneRemoteWithMedia(a.page, "context A");
        const baselines = await diskBaselines([a, b]);

        await requestRecording(a.page);
        await answerConsent(b.page, false);
        await expect(
          a.page.getByTestId(RECORDING.declined),
          "A is told the request was declined",
        ).toBeVisible();
        await attachScreenshot(testInfo, a.page, "wc-9-a-told-declined");

        await holdsFor(a.page, RECORD_WINDOW_MS, "no recording for 20 s after the decline", () =>
          notRecordingProbe(baselines),
        );

        // Positive counterpart (WC-8's behaviour) in the same run.
        await runningRecording(a, b);
        await holdsFor(a.page, COUNTERPART_RUN_MS, "counterpart keeps recording", async () =>
          (await a.page.getByTestId(RECORDING.indicator).count()) === 1 ? null : "indicator lost",
        );
        await stopRecording(a.page);
        const recorder = (await readTaps(a.page)).recorder;
        expect(recorder.started, "only the consented request started a recorder").toBe(1);
        const added = (await opfsEntries(a.page)).filter(
          (f) => !baselines[0]?.files.some((old) => old.path === f.path),
        );
        expect(added.length, "only the consented request wrote a file").toBe(1);

        await openLibraryAfterLeaving(a.page);
        const library = await readLibrary(a.page);
        expect(
          library.length,
          "the library holds the counterpart only, not the declined request",
        ).toBe(1);
        await attachJson(testInfo, "wc-9-declined-run.json", { roomCode: code, library, recorder });
      } finally {
        await closeAll([a, b]);
      }
    },
  );

  test(
    "a late joiner who declines stops the running recording for everyone and the written part is kept",
    { tag: ["@WC-9", "@value-critical", "@late-joiner"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const a = await newParticipant(browser, "Guest A", testInfo);
      const b = await newParticipant(browser, "Guest B", testInfo);
      const c = await newParticipant(browser, "Guest C", testInfo);
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await runningRecording(a, b);
        await holdsFor(a.page, 3_000, "recording runs before C joins", async () =>
          (await a.page.getByTestId(RECORDING.indicator).count()) === 1 ? null : "indicator lost",
        );

        await joinRoom(c, code);
        await expectRemoteCount(c.page, 2, "C: remote tiles");
        // D2: the late joiner sees the indicator and a consent prompt.
        await expectIndicator(c.page, true, "C sees the indicator");
        await attachScreenshot(testInfo, c.page, "wc-9-c-prompt");
        await answerConsent(c.page, false);

        await indicatorsEverywhere([a, b, c], false);
        const recorder = (await readTaps(a.page)).recorder;
        expect(recorder.started, "one recorder was started").toBe(1);
        expect(recorder.stopped, "A's recorder stopped on C's decline").toBeGreaterThanOrEqual(1);
        await holdsFor(a.page, SETTLE_MS, "recording stays stopped", async () =>
          (await readTaps(a.page)).recorder.started === 1 ? null : "a recorder started again",
        );

        await openLibraryAfterLeaving(a.page);
        const library = await readLibrary(a.page);
        expect(library.length, "what was written is kept as one recording").toBe(1);
        expect(library[0]?.sizeBytes ?? 0, "kept recording has bytes").toBeGreaterThan(0);
        await attachJson(testInfo, "wc-9-late-decline.json", { roomCode: code, library, recorder });
      } finally {
        await closeAll([a, b, c]);
      }
    },
  );

  test(
    "a late joiner who agrees leaves the recording running",
    { tag: ["@WC-9", "@negative-control", "@late-joiner"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const a = await newParticipant(browser, "Guest A", testInfo);
      const b = await newParticipant(browser, "Guest B", testInfo);
      const c = await newParticipant(browser, "Guest C", testInfo);
      try {
        const code = await startRoom(a);
        await joinRoom(b, code);
        await runningRecording(a, b);
        await joinRoom(c, code);
        await expectIndicator(c.page, true, "C sees the indicator");
        await answerConsent(c.page, true);

        await holdsFor(a.page, SETTLE_MS, "recording keeps running after C agrees", async () => {
          for (const p of [a, b, c]) {
            if ((await p.page.getByTestId(RECORDING.indicator).count()) !== 1)
              return `${p.name}: indicator lost`;
          }
          return (await readTaps(a.page)).recorder.stopped === 0 ? null : "A's recorder stopped";
        });
        await stopRecording(a.page);
        await attachScreenshot(testInfo, a.page, "wc-9-late-agree-a");
      } finally {
        await closeAll([a, b, c]);
      }
    },
  );
});
