/**
 * KMT-1/2/3, local-01-consent-and-timed-search, bound phase contract
 * a579cadfd812a5cf531e6196933f9a5b7592fb8e0ac73b99cfba232e4e02f80b.
 * Run only via the adopted packaged boundary. The Mac host provides the
 * pinned headed Chromium WebGPU runtime; packaged launch flags stay intact.
 */
import { expect, test } from "@playwright/test";
import { attachJson } from "./src/evidence.ts";
import {
  allowTranscription,
  assertLocalSpeechNetwork,
  expectNoPrivateTranscript,
  fetchedModels,
  findSettledPhrase,
  openPanel,
  openTranscriptHistory,
  panel,
  prepareModel,
  requestTranscription,
  SOURCE_WAIT_MS,
  SYNTHETIC_SPEECH,
  waitForCapture,
  withdrawAndWitnessCutoff,
  withKmtRoom,
} from "./src/kmt-flow.ts";
import {
  MARKERS,
  playPhrase,
  readKmtMedia,
  sendPcmCanary,
  stopSpeechWorker,
  tone,
} from "./src/kmt-media.ts";
import { completedKmtSearch } from "./src/kmt-search-witness.ts";
import {
  denyTranscriptDurability,
  readTranscriptStorage,
  transcriptDatabaseNames,
} from "./src/kmt-storage.ts";
import { expectOneRemoteWithMedia } from "./src/media-probes.ts";
import { expectInRoom, leave } from "./src/meeting-flow.ts";
import { readRecordedFile } from "./src/rc-outcomes-browser.ts";
import { blocked } from "./src/release-env.ts";
import {
  answerConsent,
  expectIndicator,
  openLibrary,
  requestRecording,
  stopRecording,
  waitForSavedRecording,
} from "./src/wc-recording.ts";
import { expectRemoteCount, holdsFor, joinRoom } from "./src/wc-room.ts";
import { opfsEntries } from "./src/wc-taps.ts";
import { RECORDING } from "./src/wc-test-ids.ts";

const SCENARIO = ["@kmt-scenario", "@packaged-only", "@value-critical"];
const CONTROL = ["@kmt-control", "@packaged-only", "@negative-control"];
const TEST_TIMEOUT_MS = 7 * 60 * 1_000;

test.use({ headless: false });

test(
  "KMT-1 explicit model opt-in precedes exact room consent; late and withdrawn sources stay excluded",
  {
    tag: [...SCENARIO, "@KMT-1"],
  },
  async ({ browser, baseURL }, info) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await withKmtRoom(browser, baseURL, info, async (fixture) => {
      const { host, peer, room, origin } = fixture;
      const hostBefore = await host.net.collect();
      const peerBefore = await peer.net.collect();
      await openPanel(host.page);
      await openPanel(peer.page);
      await tone(host.page, true);
      await tone(peer.page, true);
      await holdsFor(
        host.page,
        SOURCE_WAIT_MS,
        "no model or PCM before explicit opt-in",
        async () => {
          const witness = await readKmtMedia(host.page);
          const models = fetchedModels(await host.net.collect(), origin);
          return models.length === 0 &&
            witness.captureNodes.length === 0 &&
            witness.pcm.length === 0
            ? null
            : "speech model or capture began before the user's action";
        },
      );
      const optedInAt = Date.now();
      await prepareModel(host.page);
      const seenModels = fetchedModels(await host.net.collect(), origin);
      expect(
        seenModels.length,
        "native browser observed model assets after opt-in",
      ).toBeGreaterThan(0);
      expect(
        seenModels.some(({ path }) => path.endsWith(".onnx")),
        "the actual model was acquired",
      ).toBe(true);
      await requestTranscription(host.page);
      await expect(
        panel(peer.page).getByRole("button", { name: "Allow local transcription" }),
      ).toBeVisible();
      await holdsFor(
        host.page,
        SOURCE_WAIT_MS,
        "pending consent is not an acquisition grant",
        async () => {
          const witness = await readKmtMedia(host.page);
          return witness.captureNodes.length === 0 && witness.pcm.length === 0
            ? null
            : "the requester acquired a microphone or PCM while a peer was withheld";
        },
      );
      const firstGrantAt = Date.now();
      await allowTranscription(peer.page);
      await waitForCapture(host.page);
      await expect
        .poll(async () => (await readKmtMedia(host.page)).pcm.flatMap(({ markers }) => markers), {
          message: "actual speech worker receives independently marked authorized speakers",
          timeout: 30_000,
        })
        .toEqual(expect.arrayContaining([MARKERS[0], MARKERS[1]]));

      const late = await fixture.createLateGuest();
      const lateJoinAt = Date.now();
      await joinRoom(late, room);
      await tone(late.page, true);
      await expectRemoteCount(host.page, 2, "the late guest joined the live meeting");
      await expect(panel(host.page).getByText(/^Paused\./)).toBeVisible();
      const cut = await readKmtMedia(host.page);
      expect(cut.pcm.flatMap(({ markers }) => markers)).not.toContain(MARKERS[2]);
      await holdsFor(
        host.page,
        SOURCE_WAIT_MS,
        "late guest hears the call but no stale speech enters the worker",
        async () =>
          (await readKmtMedia(host.page)).pcm.length === cut.pcm.length
            ? null
            : "post-cut input observed",
      );

      await prepareModel(host.page);
      await requestTranscription(host.page);
      await allowTranscription(peer.page);
      await expect(
        panel(late.page).getByRole("button", { name: "Allow local transcription" }),
      ).toBeVisible();
      const waiting = await readKmtMedia(host.page);
      await holdsFor(
        host.page,
        SOURCE_WAIT_MS,
        "the late guest still has not granted this request",
        async () =>
          (await readKmtMedia(host.page)).pcm.length === waiting.pcm.length
            ? null
            : "withheld scope acquired PCM",
      );
      const lateGrantAt = Date.now();
      await allowTranscription(late.page);
      await waitForCapture(host.page);
      await expect
        .poll(
          async () =>
            (await readKmtMedia(host.page)).pcm
              .slice(waiting.pcm.length)
              .flatMap(({ markers }) => markers),
          { timeout: 30_000 },
        )
        .toContain(MARKERS[2]);

      for (const speaker of [host, peer, late]) await tone(speaker.page, false);
      await findSettledPhrase(fixture, info, "kmt-1-private-settled-text.json", 2);
      expect(await transcriptDatabaseNames(host.page)).toEqual([]);
      for (const other of [peer, late]) await expectNoPrivateTranscript(other.page);
      const { withdrawnAt, receivedAt, stopped } = await withdrawAndWitnessCutoff(
        host.page,
        peer.page,
      );
      await expectInRoom(host.page, room);
      await assertLocalSpeechNetwork(host, origin, hostBefore, info, { requireConsentData: true });
      await assertLocalSpeechNetwork(peer, origin, peerBefore, info, { requireConsentData: true });
      await attachJson(info, "kmt-1-admission-witness.json", {
        optedInAt,
        firstGrantAt,
        lateJoinAt,
        lateGrantAt,
        withdrawnAt,
        receivedAt,
        captureNodes: stopped.captureNodes,
        pcm: stopped.pcm,
      });
    });
  },
);

test(
  "KMT-1 control recognizes a deliberately supplied forbidden PCM marker at the worker boundary",
  {
    tag: [...CONTROL, "@KMT-1"],
  },
  async ({ browser, baseURL }, info) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await withKmtRoom(browser, baseURL, info, async ({ host, peer }) => {
      await openPanel(host.page);
      await openPanel(peer.page);
      await tone(peer.page, true);
      await prepareModel(host.page);
      await requestTranscription(host.page);
      await expect(
        panel(peer.page).getByRole("button", { name: "Allow local transcription" }),
      ).toBeVisible();
      await holdsFor(
        host.page,
        SOURCE_WAIT_MS,
        "production admission rejects a withheld source",
        async () =>
          (await readKmtMedia(host.page)).pcm.length === 0
            ? null
            : "withheld input reached the worker",
      );
      await sendPcmCanary(host.page, MARKERS[1]);
      const witness = await readKmtMedia(host.page);
      expect(witness.pcm).toEqual([
        expect.objectContaining({ samples: 64_000, markers: [MARKERS[1]] }),
      ]);
      await attachJson(info, "kmt-1-forbidden-pcm-canary.json", {
        detected: true,
        withheldProductionInput: 0,
        observations: witness.pcm,
      });
    });
  },
);

test(
  "KMT-2 live search opens the exact settled synthetic commitment at its meeting time",
  {
    tag: [...SCENARIO, "@KMT-2"],
  },
  async ({ browser, baseURL }, info) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await withKmtRoom(browser, baseURL, info, async (fixture) => {
      const { host, peer, origin } = fixture;
      const hostBefore = await host.net.collect();
      const peerBefore = await peer.net.collect();
      await openPanel(host.page);
      await prepareModel(host.page);
      await requestTranscription(host.page);
      await allowTranscription(peer.page);
      await waitForCapture(host.page);
      await findSettledPhrase(fixture, info);
      await assertLocalSpeechNetwork(host, origin, hostBefore, info, { requireConsentData: true });
      await assertLocalSpeechNetwork(peer, origin, peerBefore, info, { requireConsentData: true });
    });
  },
);

test(
  "KMT-2 control kills the actual local speech worker while the ordinary call continues",
  {
    tag: [...CONTROL, "@KMT-2"],
  },
  async ({ browser, baseURL }, info) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await withKmtRoom(browser, baseURL, info, async (fixture) => {
      const { host, peer, room, origin } = fixture;
      const before = await host.net.collect();
      await openPanel(host.page);
      await prepareModel(host.page);
      // Nonzero native mic samples with mel energy below the model's floor.
      await tone(host.page, 1e-10);
      await requestTranscription(host.page);
      await allowTranscription(peer.page);
      await waitForCapture(host.page);
      await expect
        .poll(async () => (await readKmtMedia(host.page)).alignmentGaps, {
          message: "real ASR worker detected unalignable audio",
          timeout: 30_000,
        })
        .toBeGreaterThan(0);
      const gaps = panel(host.page).getByText("Some speech was not captured.");
      await expect(gaps.first()).toBeVisible();
      await expect(panel(host.page).getByText("Transcribing on this device.")).toBeVisible();
      await tone(host.page, false);
      const alignmentGaps = (await readKmtMedia(host.page)).alignmentGaps;
      expect(await stopSpeechWorker(host.page), "the real local speech worker was terminated").toBe(
        true,
      );
      const killedAt = Date.now();
      const emitted = await playPhrase(peer.page);
      const search = panel(host.page).getByRole("searchbox", { name: "Search settled transcript" });
      await search.fill("blue folder");
      await expect(
        panel(host.page).getByText(/^On-device transcription is unavailable/),
      ).toBeVisible({
        timeout: 30_000,
      });
      await expect(panel(host.page).getByText("No settled text matches yet.")).toBeVisible();
      await expect(panel(host.page).getByRole("button", { name: SYNTHETIC_SPEECH })).toHaveCount(0);
      await search.fill("");
      await expect(
        panel(host.page).getByText("Some speech was not captured.").first(),
      ).toBeVisible();
      await expectInRoom(host.page, room);
      await expectInRoom(peer.page, room);
      await expectOneRemoteWithMedia(
        host.page,
        "ordinary RTC media continues after ASR worker loss",
      );
      await assertLocalSpeechNetwork(host, origin, before, info, { requireConsentData: true });
      await attachJson(info, "kmt-2-worker-loss.json", {
        alignmentGaps,
        killedAt,
        emitted,
        callStillLive: true,
      });
    });
  },
);

test(
  "KMT-3 local retained text reopens only in the requester profile and deletes without altering WebM",
  {
    tag: [...SCENARIO, "@KMT-3"],
  },
  async ({ browser, baseURL }, info) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await withKmtRoom(browser, baseURL, info, async (fixture) => {
      const { host, peer, origin } = fixture;
      const before = await host.net.collect();
      const recordings = await opfsEntries(host.page);
      await openPanel(host.page);
      await prepareModel(host.page);
      await requestTranscription(host.page, true);
      await allowTranscription(peer.page);
      await waitForCapture(host.page);

      await requestRecording(host.page);
      await answerConsent(peer.page, true);
      await expectIndicator(host.page, true, "separately consented WebM recording is active");
      await findSettledPhrase(fixture, info);
      await panel(host.page).getByRole("button", { name: "Stop transcription" }).click();
      await expect(panel(host.page).getByText(/^Paused\./)).toBeVisible();
      const save = panel(host.page).getByRole("button", { name: "Save a copy in this browser" });
      await save.click();
      await expect(panel(host.page).getByText("Saved. Reopen it in History.")).toBeVisible();
      const stored = await readTranscriptStorage(host.page);
      expect(stored.entries, "one scoped transcript exists independently of UI").toBe(1);
      expect(stored.lines).toBeGreaterThan(0);
      expect(stored.matching.some(({ text }) => SYNTHETIC_SPEECH.test(text))).toBe(true);
      await expectIndicator(
        host.page,
        true,
        "local transcription and its save leave recording running",
      );
      const cutoff = await stopRecording(host.page);
      await assertLocalSpeechNetwork(host, origin, before, info, { requireConsentData: true });

      await leave(host.page);
      await openLibrary(host.page);
      const added = await waitForSavedRecording(host.page, cutoff, recordings);
      const file = added[0]?.path;
      if (added.length !== 1 || !file?.startsWith("know-meet-recordings/")) {
        throw blocked("the separately consented WebM recording could not be identified in OPFS");
      }
      const fileName = file.slice("know-meet-recordings/".length);
      const recordingBefore = await readRecordedFile(host.page, fileName);
      expect(recordingBefore.bytes).toBeGreaterThan(0);

      const other = await openTranscriptHistory(peer.page, true);
      await expect(other.getByText("No transcripts saved here.")).toBeVisible();
      expect(await transcriptDatabaseNames(peer.page)).toEqual([]);

      await host.page.reload();
      await expect(host.page.getByTestId(RECORDING.library)).toBeVisible();
      const library = await openTranscriptHistory(host.page, false);
      await library.getByRole("button", { name: "Open transcript", exact: true }).click();
      await library
        .getByRole("searchbox", { name: "Search settled transcript" })
        .fill("blue folder");
      await expect(library.getByRole("button", { name: SYNTHETIC_SPEECH }).first()).toBeVisible();
      const savedSearch = await completedKmtSearch(host.page);
      expect(
        savedSearch.retained,
        "the real retained PGlite search worker answered",
      ).toBeGreaterThan(0);
      const restored = await readTranscriptStorage(host.page);
      expect(restored).toEqual(stored);
      expect(await transcriptDatabaseNames(host.page)).toHaveLength(1);
      await library.getByRole("button", { name: "Delete transcript" }).click();
      await library.getByRole("button", { name: "Delete from this browser" }).click();
      await expect(library.getByText("No transcripts saved here.")).toBeVisible();
      const cleared = await readTranscriptStorage(host.page);
      expect(cleared).toEqual({ entries: 0, lines: 0, matching: [], fingerprint: null });

      await host.page.reload();
      await expect(
        host.page.getByRole("region", { name: "Browser-local transcripts" }),
      ).toBeVisible();
      const afterReload = host.page.getByRole("region", { name: "Browser-local transcripts" });
      await afterReload.getByRole("button", { name: "Open local transcripts" }).click();
      await expect(afterReload.getByText("No transcripts saved here.")).toBeVisible();
      expect(await readTranscriptStorage(host.page)).toEqual(cleared);
      const recordingAfter = await readRecordedFile(host.page, fileName);
      expect(recordingAfter, "transcript deletion changes zero bytes of the recording").toEqual(
        recordingBefore,
      );
      await attachJson(info, "kmt-3-storage-witness.json", {
        before: {
          entries: stored.entries,
          lines: stored.lines,
          knownPhraseMatches: stored.matching.length,
        },
        after: cleared,
        isolatedProfile: true,
        retainedSearchWorkerReplies: savedSearch.retained,
        recordingBefore,
        recordingAfter,
      });
    });
  },
);

test(
  "KMT-3 control does not report successful retention when transcript storage denies a write",
  {
    tag: [...CONTROL, "@KMT-3"],
  },
  async ({ browser, baseURL }, info) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    await withKmtRoom(browser, baseURL, info, async (fixture) => {
      const { host, peer, room } = fixture;
      await openPanel(host.page);
      await prepareModel(host.page);
      await requestTranscription(host.page, true);
      await allowTranscription(peer.page);
      await waitForCapture(host.page);
      await findSettledPhrase(fixture, info);
      await panel(host.page).getByRole("button", { name: "Stop transcription" }).click();
      await expect(panel(host.page).getByText(/^Paused\./)).toBeVisible();
      const save = panel(host.page).getByRole("button", { name: "Save a copy in this browser" });
      await save.click();
      await expect(panel(host.page).getByText("Saved. Reopen it in History.")).toBeVisible();
      const baseline = await readTranscriptStorage(host.page);
      expect(baseline.entries).toBe(1);
      const faultObserved = await denyTranscriptDurability(host.page);
      await prepareModel(host.page);
      await requestTranscription(host.page, true);
      await allowTranscription(peer.page);
      await waitForCapture(host.page);
      await findSettledPhrase(fixture, info, "kmt-3-second-scope-time.json");
      await panel(host.page).getByRole("button", { name: "Stop transcription" }).click();
      await expect(panel(host.page).getByText(/^Paused\./)).toBeVisible();
      await expect(save, "the new request has a settled staged copy to save").toBeEnabled();
      await save.click();
      await expect(panel(host.page).getByText(/^Save could not be verified/)).toBeVisible({
        timeout: 40_000,
      });
      await expect
        .poll(faultObserved, {
          message: "a real retained IndexedDB write tried to persist",
        })
        .toBe(true);
      await expect(panel(host.page).getByText("Saved. Reopen it in History.")).toHaveCount(0);
      await expectInRoom(host.page, room);
      const library = await openTranscriptHistory(host.page, true);
      await expect(
        library.getByRole("button", { name: "Open transcript", exact: true }),
      ).toHaveCount(1);
      await host.page.reload();
      await expect(
        host.page.getByRole("region", { name: "Browser-local transcripts" }),
      ).toBeVisible();
      const reopened = await openTranscriptHistory(host.page, false);
      await expect(
        reopened.getByRole("button", { name: "Open transcript", exact: true }),
      ).toHaveCount(1);
      const afterDeniedWrite = await readTranscriptStorage(host.page);
      expect(afterDeniedWrite, "same durable rows after denial and reload").toEqual(baseline);
      await attachJson(info, "kmt-3-failed-durability.json", {
        baselineEntries: baseline.entries,
        deniedWriteObserved: true,
        successReported: false,
        reopenedFingerprintMatches: afterDeniedWrite.fingerprint === baseline.fingerprint,
      });
    });
  },
);
