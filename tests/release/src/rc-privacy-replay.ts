import { expect, test } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { leave } from "./meeting-flow.ts";
import { waitForEvents } from "./rc-outcomes-oracles.ts";
import {
  armConsentFault,
  type Challenge,
  matchingConsentReceipt,
  observedConsentFault,
  runningChallenge,
} from "./rc-privacy-consent.ts";
import { decodeLibraryRecording } from "./rc-privacy-decode.ts";
import {
  markedRoom,
  micAt,
  preCutoff,
  requireMarkers,
  starting,
  videoAt,
} from "./rc-privacy-fixtures.ts";
import { readBrowserMedia, setMarkerPhase } from "./rc-privacy-media.ts";
import { blocked } from "./release-env.ts";
import {
  answerConsent,
  expectIndicator,
  openLibraryAfterLeaving,
  requestRecording,
  stopRecording,
} from "./wc-recording.ts";
import { expectRemoteCount, holdsFor, joinRoom } from "./wc-room.ts";
import { RECORDING } from "./wc-test-ids.ts";

export function registerPriorRequestReplay(tags: string[]): void {
  test(
    "RC-1 a prior recording request cannot authorize or stop the current recording",
    { tag: tags },
    async ({ browser }, testInfo) => {
      test.setTimeout(180_000);
      await markedRoom(browser, testInfo, ["A", "B", "C"], async ([a, b, c]) => {
        if (a === undefined || b === undefined || c === undefined)
          throw blocked("three isolated media clients are required");
        const code = await starting(a, b, false);
        await preCutoff(a, b);
        await joinRoom(c, code);
        await expect(c.page.getByTestId(RECORDING.prompt)).toBeVisible();
        const old = await runningChallenge(c.page);
        await answerConsent(c.page, true);
        const oldReceiptAt = await matchingConsentReceipt(a.page, old, "agreed");
        await stopRecording(a.page);
        await expectIndicator(b.page, false, "the previous request ended at the existing peer");
        await expectIndicator(c.page, false, "the previous request ended at the late guest");
        await leave(c.page);
        await expectRemoteCount(a.page, 1, "the previous guest admission has ended");

        await requestRecording(a.page);
        await answerConsent(b.page, true);
        await expectIndicator(a.page, true, "the new recording is active");
        const secondEncoder = (await waitForEvents(a.page, "encoder-start", 2)).at(-1);
        if (secondEncoder === undefined) throw blocked("second encoder start was not witnessed");
        await expectIndicator(b.page, true, "the existing peer sees the new recording");

        const guestTracks = new Set<string>();
        let previous: Challenge | undefined;
        for (const answer of ["agreed", "declined"] as const) {
          await joinRoom(c, code);
          await expect(c.page.getByTestId(RECORDING.prompt)).toBeVisible();
          const current = await runningChallenge(c.page, previous);
          previous = current;
          expect(current.requestId, "the guest is answering a new request").not.toBe(old.requestId);
          await videoAt(a, c, "c0");
          guestTracks.add(await micAt(a, c, "c0"));
          // Keep the current sender and admission. Only the request ID is stale.
          const replacement = { ...current, requestId: old.requestId };
          await armConsentFault(c.page, { ...current, replacement });
          await answerConsent(c.page, answer === "agreed");
          const at = await matchingConsentReceipt(a.page, replacement, answer);
          expect(at, "the stale answer was received during the second recording").toBeGreaterThan(
            secondEncoder.at,
          );
          await attachJson(testInfo, `rc-1-prior-request-${answer}.json`, {
            old,
            oldReceiptAt,
            current,
            replacement,
            receiptAt: at,
            fault: await observedConsentFault(c.page),
          });
          await holdsFor(
            a.page,
            900,
            "the current recording survives the prior request answer",
            async () =>
              (await a.page.getByTestId(RECORDING.indicator).count()) === 1
                ? null
                : "stale request stopped the recording",
          );
          await leave(c.page);
          await expectRemoteCount(a.page, 1, "the replay admission ends before the next prompt");
        }

        await joinRoom(c, code);
        await expect(c.page.getByTestId(RECORDING.prompt)).toBeVisible();
        const current = await runningChallenge(c.page, previous);
        await setMarkerPhase(c.page, 1);
        await videoAt(a, c, "c1");
        guestTracks.add(await micAt(a, c, "c1"));
        await answerConsent(c.page, true);
        const validReceiptAt = await matchingConsentReceipt(a.page, current, "agreed");
        await holdsFor(a.page, 900, "the current valid answer keeps capture active", async () =>
          (await a.page.getByTestId(RECORDING.indicator).count()) === 1
            ? null
            : "the current recording indicator disappeared",
        );
        const { events } = await readBrowserMedia(a.page);
        const admission = events.filter(
          ({ at, kind, value }) =>
            at >= secondEncoder.at &&
            ((kind === "compositor-label" && value.includes(c.name)) ||
              (kind === "compositor-frame" && /^c[01]:/.test(value)) ||
              (kind === "mixer-connected" && guestTracks.has(value))),
        );
        expect(admission.filter(({ at }) => at < validReceiptAt)).toEqual([]);
        expect(admission.some(({ kind }) => kind === "compositor-label")).toBe(true);

        await stopRecording(a.page);
        await waitForEvents(a.page, "writer-closed", 2, 20_000);
        await openLibraryAfterLeaving(a.page);
        const clip = a.page
          .getByTestId(RECORDING.item)
          .and(a.page.locator(`[data-recording-id="${current.requestId}"]`));
        await expect(clip, "the saved clip belongs to the current request").toBeVisible({
          timeout: 20_000,
        });
        await clip.click();
        const decoded = await decodeLibraryRecording(a.page, testInfo, "rc-1-prior-request");
        requireMarkers(decoded, ["a0", "b0", "c1"]);
        expect(decoded.video.c0, "prior request cannot admit the camera").toBe(0);
        expect(decoded.audioQuantum.c0, "prior request cannot admit the microphone").toBe(0);
      });
    },
  );
}
