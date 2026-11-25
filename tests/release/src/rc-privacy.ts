import { expect, test } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { leave } from "./meeting-flow.ts";
import {
  configureOutcomeBrowser,
  readOutcomeBrowser,
  releaseOutcomeEncoder,
  releaseOutcomeWriter,
} from "./rc-outcomes-browser.ts";
import {
  armConsentFault,
  matchingConsentReceipt,
  observedConsentFault,
  runningChallenge,
} from "./rc-privacy-consent.ts";
import { attachDecoderIdentity, type DecodedMarkers, encodedControl } from "./rc-privacy-decode.ts";
import {
  libraryClip,
  markedRoom,
  micAt,
  observedOutcome,
  otherTile,
  preCutoff,
  requireMarkers,
  requireRecorderMicEnded,
  shareAt,
  starting,
  videoAt,
} from "./rc-privacy-fixtures.ts";
import {
  type MarkerId,
  readBrowserMedia,
  setMarkerPhase,
  setPrivacyMicHold,
} from "./rc-privacy-media.ts";
import { registerPriorRequestReplay } from "./rc-privacy-replay.ts";
import { blocked } from "./release-env.ts";
import { answerConsent, expectIndicator, stopRecording } from "./wc-recording.ts";
import { expectRemoteCount, holdsFor, joinRoom } from "./wc-room.ts";
import { RECORDING, SHARE } from "./wc-test-ids.ts";

const TAGS = ["@packaged-only", "@value-critical"];
const CONTROL_TAGS = [...TAGS, "@rc-control"];

interface EdgeInput {
  readonly side: "before" | "after";
  readonly kind: "video" | "audio" | "label";
  readonly lateGuest: boolean;
}

function rejectedEdge(
  inputs: readonly EdgeInput[],
  boundary: "admission" | "cutoff",
): EdgeInput | undefined {
  return inputs.find((input) =>
    boundary === "admission" ? input.side === "before" && input.lateGuest : input.side === "after",
  );
}

function decodedForbidden(decoded: DecodedMarkers, ids: readonly MarkerId[]): MarkerId | undefined {
  return ids.find((id) => decoded.video[id] > 0 || decoded.audioQuantum[id] > 0);
}

function registerControls(): void {
  for (const id of ["RC-1", "RC-2"] as const) {
    test(`${id} rejects forbidden recorder-edge input and independently encoded markers`, {
      tag: CONTROL_TAGS,
    }, async () => {
      const testInfo = test.info();
      const side = id === "RC-1" ? "before" : "after";
      const boundary = id === "RC-1" ? "admission" : "cutoff";
      const good: EdgeInput = {
        side: side === "before" ? "after" : "before",
        kind: "video",
        lateGuest: true,
      };
      expect(rejectedEdge([good], boundary)).toBeUndefined();
      for (const kind of ["video", "audio", "label"] as const) {
        const forbidden: EdgeInput = { side, kind, lateGuest: true };
        expect(rejectedEdge([good, forbidden], boundary)).toEqual(forbidden);
      }
      await attachDecoderIdentity(testInfo);
      const clean = await encodedControl(testInfo, "clean");
      const frame = await encodedControl(testInfo, "frame");
      expect(clean.video.a0).toBe(24);
      for (const eligible of ["a0", "b0"] as const) {
        expect(clean.audio[eligible]).toBeGreaterThan(0);
        expect(clean.audioQuantum[eligible]).toBeGreaterThan(0);
      }
      expect(
        decodedForbidden(clean, ["a1", "b1", "c0", "c1", "share0", "share1"]),
        "mixed eligible audio and level changes do not invent a forbidden marker",
      ).toBeUndefined();
      expect(frame.video.c1, "exactly one forbidden encoded frame").toBe(1);
      expect(decodedForbidden(frame, ["c1"])).toBe("c1");
      for (const forbiddenAudio of id === "RC-2" ? (["c1", "a1"] as const) : (["c1"] as const)) {
        const audio = await encodedControl(testInfo, "audio", forbiddenAudio);
        expect(
          audio.audioQuantum[forbiddenAudio],
          "detects one encoded 20 ms injected forbidden quantum",
        ).toBeGreaterThan(0);
        expect(decodedForbidden(audio, [forbiddenAudio])).toBe(forbiddenAudio);
      }
    });
  }
}

function registerLateConsent(): void {
  test(
    "RC-1 late guest can participate before affirmative admission and is captured only afterward",
    { tag: TAGS },
    async ({ browser }, testInfo) => {
      await markedRoom(browser, testInfo, ["A", "B", "C"], async ([a, b, c]) => {
        if (a === undefined || b === undefined || c === undefined)
          throw blocked("three isolated media clients are required");
        const code = await starting(a, b, false);
        await preCutoff(a, b);
        await joinRoom(c, code);
        await expectRemoteCount(a.page, 2, "C admission is independently visible in the room");
        await expect(c.page.getByTestId(RECORDING.prompt)).toBeVisible();
        await Promise.all([videoAt(b, c, "c0"), micAt(b, c, "c0"), micAt(c, a, "a0")]);
        await c.page.getByTestId(SHARE.control).click();
        const [cMic, cShare] = await Promise.all([
          micAt(a, c, "c0"),
          shareAt(a, "share0", "share0"),
          shareAt(b, "share0", "share0"),
        ]);
        await holdsFor(
          a.page,
          800,
          "recorder remains active while participant C has not answered",
          async () =>
            (await a.page.getByTestId(RECORDING.indicator).count()) === 1
              ? null
              : "active indicator disappeared",
        );
        const pending = await readBrowserMedia(a.page);
        expect(
          pending.events.filter(
            (event) => event.kind === "compositor-label" && event.value.includes(c.name),
          ),
        ).toEqual([]);
        expect(
          pending.events.filter(
            (event) => event.kind === "compositor-frame" && /^(c0|share0):/.test(event.value),
          ),
        ).toEqual([]);
        expect(
          pending.events.filter(
            (event) => event.kind === "mixer-connected" && [cMic, cShare].includes(event.value),
          ),
        ).toEqual([]);
        // Move to disjoint marker IDs while still excluded. The time before the matching
        // transport receipt is checked by the independent edge clock below.
        await setMarkerPhase(c.page, 1);
        await Promise.all([videoAt(b, c, "c1"), micAt(b, c, "c1"), shareAt(b, "share1", "share1")]);
        const challenge = await runningChallenge(c.page);
        await answerConsent(c.page, true);
        const receiptAt = await matchingConsentReceipt(a.page, challenge, "agreed");
        await holdsFor(
          a.page,
          900,
          "agreement permits capture while the recording continues",
          async () =>
            (await a.page.getByTestId(RECORDING.indicator).count()) === 1
              ? null
              : "active indicator disappeared",
        );
        const trace = await readBrowserMedia(a.page);
        const scopedInputs = trace.events.flatMap((event): EdgeInput[] => {
          const side = event.at < receiptAt ? "before" : "after";
          if (event.kind === "compositor-frame")
            return [{ side, kind: "video", lateGuest: /^(c[01]|share[01]):/.test(event.value) }];
          if (event.kind === "compositor-label")
            return [{ side, kind: "label", lateGuest: event.value.includes(c.name) }];
          if (event.kind === "mixer-connected")
            return [{ side, kind: "audio", lateGuest: [cMic, cShare].includes(event.value) }];
          return [];
        });
        expect(
          rejectedEdge(scopedInputs, "admission"),
          "no late guest identity, video, or mixer connection before the wire receipt",
        ).toBeUndefined();
        expect(
          scopedInputs.some(
            ({ side, kind, lateGuest }) => side === "after" && kind === "label" && lateGuest,
          ),
          "the compositor draws the late guest name after matching consent",
        ).toBe(true);
        await stopRecording(a.page);
        const decoded = await libraryClip(a.page, testInfo, "rc-1-agreement");
        requireMarkers(decoded, ["a0", "b0", "c1", "share1"]);
        expect(
          decodedForbidden(decoded, ["c0", "share0"]),
          "pending camera, microphone, share video and share audio are excluded",
        ).toBeUndefined();
      });
    },
  );

  test(
    "RC-1 failed delivery and stale rejoin answers leave live capture active and exclude the current guest",
    { tag: TAGS },
    async ({ browser }, testInfo) => {
      test.setTimeout(180_000);
      await markedRoom(browser, testInfo, ["A", "B", "C"], async ([a, b, c]) => {
        if (a === undefined || b === undefined || c === undefined)
          throw blocked("three isolated media clients are required");
        const code = await starting(a, b, false);
        await preCutoff(a, b);
        await joinRoom(c, code);
        await expect(c.page.getByTestId(RECORDING.prompt)).toBeVisible();
        const oldIdentity = await otherTile(a.page, c).getAttribute("data-participant-identity");
        const original = await runningChallenge(c.page);
        await armConsentFault(c.page, original);
        await c.page.getByTestId(RECORDING.agree).click();
        try {
          await expect
            .poll(() => observedConsentFault(c.page), { timeout: 4_000 })
            .toMatchObject({ sent: null });
        } catch {
          throw blocked(
            "controlled send failure did not intercept the matching late consent answer",
          );
        }
        await expect(
          c.page.getByTestId(RECORDING.prompt),
          "failed delivery asks C to answer again",
        ).toBeVisible();
        await attachJson(testInfo, "rc-1-failed-delivery.json", {
          challenge: original,
          fault: await observedConsentFault(c.page),
        });
        let previous = original;
        for (const agree of [true, false]) {
          await leave(c.page);
          await expectRemoteCount(a.page, 1, "recorder independently sees C depart");
          await joinRoom(c, code);
          await expect(c.page.getByTestId(RECORDING.prompt)).toBeVisible();
          await expect(otherTile(a.page, c)).not.toHaveAttribute(
            "data-participant-identity",
            oldIdentity ?? "",
          );
          const current = await runningChallenge(c.page, previous);
          previous = current;
          expect(current.requestId).toBe(original.requestId);
          expect(current.admissionId).not.toBe(original.admissionId);
          await Promise.all([videoAt(b, c, "c0"), micAt(b, c, "c0")]);
          await armConsentFault(c.page, {
            ...current,
            replacement: original,
          });
          await answerConsent(c.page, agree);
          const answer = agree ? "agreed" : "declined";
          const receiptAt = await matchingConsentReceipt(a.page, original, answer);
          await attachJson(testInfo, `rc-1-stale-${answer}.json`, {
            current,
            original,
            receiptAt,
            fault: await observedConsentFault(c.page),
          });
          await holdsFor(a.page, 900, `recording continues after stale ${answer}`, async () =>
            (await a.page.getByTestId(RECORDING.indicator).count()) === 1
              ? null
              : "stale answer stopped the recording",
          );
        }
        const edge = await readBrowserMedia(a.page);
        expect(
          edge.events.filter(
            (event) => event.kind === "compositor-label" && event.value.includes(c.name),
          ),
        ).toEqual([]);
        await stopRecording(a.page);
        const decoded = await libraryClip(a.page, testInfo, "rc-1-stale-answers");
        requireMarkers(decoded, ["a0", "b0"]);
        expect(
          decodedForbidden(decoded, ["c0"]),
          "a stale challenge cannot admit the rejoining camera or microphone",
        ).toBeUndefined();
      });
    },
  );
}

function registerStartupCutoff(): void {
  for (const operation of ["stop", "leave"] as const) {
    test(
      `RC-2 ${operation} during microphone startup cancels before a late track can enter capture`,
      { tag: TAGS },
      async ({ browser }, testInfo) => {
        await markedRoom(browser, testInfo, ["A", "B"], async ([a, b]) => {
          if (a === undefined || b === undefined)
            throw blocked("two isolated media clients are required");
          await starting(a, b, true);
          await expect
            .poll(async () => (await readBrowserMedia(a.page)).heldMicrophones.length)
            .toBe(1);
          const held = (await readBrowserMedia(a.page)).heldMicrophones[0];
          expect(held?.state).toBe("live");
          if (operation === "stop") await stopRecording(a.page);
          else await leave(a.page);
          await setPrivacyMicHold(a.page, "release");
          await expect
            .poll(async () => (await readBrowserMedia(a.page)).heldMicrophones[0]?.state, {
              message: "the late-acquired recorder-only microphone is ended immediately",
            })
            .toBe("ended");
          const trace = await readBrowserMedia(a.page);
          expect(
            trace.events.filter(
              (event) => event.kind === "mixer-connected" && event.value === held?.id,
            ),
          ).toEqual([]);
          expect(
            (await readOutcomeBrowser(a.page)).filter((event) => event.kind === "encoder-start"),
          ).toEqual([]);
          await expectIndicator(a.page, false, "canceled start never became active again");
        });
      },
    );
  }
}

function registerActiveCutoff(): void {
  for (const operation of ["stop", "leave", "decline"] as const) {
    const ids = operation === "decline" ? "RC-1 RC-2" : "RC-2";
    test(
      `${ids} active ${operation} cuts capture during independent encoder and writer holds`,
      { tag: TAGS },
      async ({ browser }, testInfo) => {
        await markedRoom(browser, testInfo, ["A", "B", "C"], async ([a, b, c]) => {
          if (a === undefined || b === undefined || c === undefined)
            throw blocked("isolated media clients are required");
          const code = await starting(a, b, false);
          await preCutoff(a, b);
          await configureOutcomeBrowser(a.page, { holdClose: true, holdStop: true });
          let declineAt: number | undefined;
          if (operation === "decline") {
            await joinRoom(c, code);
            const challenge = await runningChallenge(c.page);
            await answerConsent(c.page, false);
            declineAt = await matchingConsentReceipt(a.page, challenge, "declined");
          } else if (operation === "stop") {
            await stopRecording(a.page);
          } else {
            await leave(a.page);
          }
          const encoderCutoff = await observedOutcome(a.page, "encoder-stop-called", 1_500);
          const acceptedAt =
            declineAt ??
            (await readOutcomeBrowser(a.page)).findLast(
              (event) => event.kind === `action-${operation}` && event.at <= encoderCutoff.at,
            )?.at;
          if (acceptedAt === undefined || acceptedAt > encoderCutoff.at)
            throw blocked(`independent ${operation} acceptance timestamp is missing`);
          await Promise.all([setMarkerPhase(a.page, 1), setMarkerPhase(b.page, 1)]);
          await requireRecorderMicEnded(a.page, acceptedAt);
          const { events } = await readBrowserMedia(a.page);
          const activeMixerSources = new Set<string>();
          for (const event of events.filter((entry) => entry.at < acceptedAt)) {
            if (event.kind === "mixer-connected") activeMixerSources.add(event.value);
            if (event.kind === "mixer-disconnected") activeMixerSources.delete(event.value);
          }
          if (activeMixerSources.size === 0)
            throw blocked("no pre-cutoff mixer source was identified");
          for (const source of activeMixerSources) {
            expect(
              events.some(
                (event) =>
                  event.kind === "mixer-disconnected" &&
                  event.value === source &&
                  event.at >= acceptedAt &&
                  event.at <= encoderCutoff.at,
              ),
              "each active mixer input detaches by encoder stop, before finalization",
            ).toBe(true);
          }
          expect(
            events.filter(
              (event) => event.kind === "mixer-connected" && event.at > encoderCutoff.at,
            ),
          ).toEqual([]);
          // The trace is read after encoder stop, so it includes draws between a
          // matching wire receipt and the encoder's later stop call.
          const captured = events.filter((event) => event.kind === "compositor-frame");
          const edges = captured.map(
            (event): EdgeInput => ({
              side: event.at > acceptedAt ? "after" : "before",
              kind: "video",
              lateGuest: false,
            }),
          );
          expect(
            rejectedEdge(edges, "cutoff"),
            "no compositor draw after observed cutoff",
          ).toBeUndefined();
          await expect
            .poll(
              async () => {
                const sourceEvents = (await readBrowserMedia(b.page)).events;
                return (
                  sourceEvents.some(
                    (event) => event.kind === "source-frame" && event.value.startsWith("b1:"),
                  ) &&
                  sourceEvents.some(
                    (event) =>
                      event.kind === "source-audio-window" && event.value.startsWith("b1:"),
                  )
                );
              },
              {
                timeout: 1_500,
                message: "source frames and audio windows continue during the encoder hold",
              },
            )
            .toBe(true);
          await observedOutcome(a.page, "encoder-stopped", 1_500);
          expect(
            (await readOutcomeBrowser(a.page)).some(
              (event) => event.kind === "writer-close-request",
            ),
          ).toBe(false);
          await releaseOutcomeEncoder(a.page);
          await observedOutcome(a.page, "writer-close-request", 3_000);
          expect(
            (await readOutcomeBrowser(a.page)).some((event) => event.kind === "writer-closed"),
          ).toBe(false);
          await requireRecorderMicEnded(a.page, acceptedAt);
          const bTrace = await readBrowserMedia(b.page);
          expect(
            bTrace.events.some(
              (event) => event.kind === "source-frame" && event.value.startsWith("b1:"),
            ),
          ).toBe(true);
          expect(
            bTrace.events.some(
              (event) => event.kind === "source-audio-window" && event.value.startsWith("b1:"),
            ),
          ).toBe(true);
          if (operation === "stop") await micAt(b, a, "a1");
          await releaseOutcomeWriter(a.page);
          const decoded = await libraryClip(a.page, testInfo, `rc-2-${operation}`);
          requireMarkers(decoded, ["a0", "b0"]);
          expect(
            decodedForbidden(decoded, ["a1", "b1", "c0", "c1"]),
            "pre-cutoff material retained and zero disjoint post-cutoff markers",
          ).toBeUndefined();
        });
      },
    );
  }
}

export function registerPrivacyCases(): void {
  registerControls();
  registerLateConsent();
  registerPriorRequestReplay(TAGS);
  registerStartupCutoff();
  registerActiveCutoff();
}
