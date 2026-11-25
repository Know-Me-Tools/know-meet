import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { expect, type Page, test } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { recordedVideoProgress } from "./rc-frozen-video.ts";
import {
  configureOutcomeBrowser,
  exhaustNextWriterAppend,
  injectEncoderFailure,
  type OutcomeEvent,
  readOutcomeBrowser,
  readRecordedFile,
  recordedFileBytes,
  releaseOutcomeEncoder,
  releaseOutcomeWriter,
  writerPrefix,
} from "./rc-outcomes-browser.ts";
import {
  completenessRejection,
  eventOf,
  expectLibraryCondition,
  noticeRejection,
  waitForEvents,
} from "./rc-outcomes-oracles.ts";
import {
  closeOutcomeParticipants,
  type Fixtures,
  outcomeParticipant,
  recordWith,
  twoChunks,
} from "./rc-outcomes-room.ts";
import {
  type DecodedMarkers,
  decodeLibraryRecording,
  encodedControl,
} from "./rc-privacy-decode.ts";
import { armShortClip, readBrowserMedia, setPrivacyMicHold } from "./rc-privacy-media.ts";
import { blocked } from "./release-env.ts";
import { openLibraryAfterLeaving, requestRecording, stopRecording } from "./wc-recording.ts";
import { type Participant, startRoom } from "./wc-room.ts";
import { RECORDING } from "./wc-test-ids.ts";

const TAGS = ["@packaged-only", "@value-critical", "@RC-4"];
const CONTROL = { tag: [...TAGS, "@rc-control"] };
const SCENARIO = { tag: TAGS };
const run = promisify(execFile);

async function solo(f: Fixtures): Promise<Participant> {
  const a = await outcomeParticipant(f, "A");
  await startRoom(a);
  return a;
}

async function recordingFileName(page: Page): Promise<string> {
  const name = eventOf(await readOutcomeBrowser(page), "writer-open-request").detail;
  if (name === undefined) throw blocked("recording writer had no observed file name");
  return name;
}

async function failureNotice(page: Page, timeout = 1000): Promise<OutcomeEvent> {
  const alert = page.locator('[role="status"][aria-live="off"]').filter({
    hasText: /Recording failed\.|Recording stopped because browser storage ran out\./,
  });
  await expect(alert, "the recording failure is shown in the room").toBeVisible({ timeout });
  return eventOf(await readOutcomeBrowser(page), "failure-notice");
}

async function library(
  a: Participant,
  f: Fixtures,
  condition: "complete" | "incomplete",
  label: string,
  saveDeadline?: number,
): Promise<DecodedMarkers> {
  await openLibraryAfterLeaving(a.page);
  const remaining = saveDeadline === undefined ? 20_000 : saveDeadline - Date.now();
  expect(remaining, "library reached before the save deadline").toBeGreaterThan(0);
  await expectLibraryCondition(a.page, condition, remaining);
  return decodeLibraryRecording(a.page, f.testInfo, label);
}

function playablePrefix(decoded: DecodedMarkers): void {
  if (decoded.video.a0 === 0 || decoded.audio.a0 === 0) {
    throw blocked(
      "played prefix did not resolve the fixture's intended camera and microphone markers",
    );
  }
  expect(decoded.videoProgress.a0, "retained camera visibly progresses").toBeGreaterThan(1);
  expect(decoded.audio.a0, "retained microphone has multiple marker windows").toBeGreaterThan(1);
}

async function shortComplete(f: Fixtures): Promise<void> {
  const a = await solo(f);
  await setPrivacyMicHold(a.page, "observe");
  await armShortClip(a.page, RECORDING.control);
  await requestRecording(a.page);
  const encoderStart = eventOf(await waitForEvents(a.page, "encoder-start"), "encoder-start").at;
  const cutoff = eventOf(await waitForEvents(a.page, "action-stop"), "action-stop").at;
  const outcome = await readOutcomeBrowser(a.page);
  const active = eventOf(outcome, "indicator-on").at;
  const encoderStop = eventOf(outcome, "encoder-stop-called").at;
  expect(active, "the recording indicator appeared before Stop").toBeLessThan(cutoff);
  await expect(a.page.getByTestId(RECORDING.indicator)).toHaveCount(0);
  const source = await readBrowserMedia(a.page);
  const start = source.events.find(
    ({ kind, value }) => kind === "compositor-frame" && value.startsWith("a0:"),
  )?.at;
  if (start === undefined) throw blocked("short clip never drew a live marked camera frame");
  if (cutoff - start < 600 || cutoff - start > 1000) {
    throw blocked("short clip did not fall within the adopted 600–1000 ms interval");
  }

  const lastCamera = source.events.findLast(
    (event) => event.kind === "source-frame" && event.value.startsWith("a1:") && event.at <= cutoff,
  );
  if (lastCamera === undefined || lastCamera.at < cutoff - 200)
    throw blocked("last intended camera marker did not resolve near cutoff");

  const [microphone] = source.heldMicrophones;
  if (source.heldMicrophones.length !== 1 || microphone === undefined)
    throw blocked("could not independently identify the recorder-only microphone");
  const lastAudioWindow = source.events.findLast(
    (event) =>
      event.kind === "source-audio-window" &&
      event.sourceTrackId === microphone.id &&
      event.at <= cutoff,
  );
  const mixerEdges = source.events.filter(
    (event) =>
      event.value === microphone.id &&
      (event.kind === "mixer-connected" || event.kind === "mixer-disconnected"),
  );
  const admitted = mixerEdges.findLast(({ at }) => at < cutoff);
  const detached = mixerEdges.find(({ at }) => at >= cutoff);
  const micEnded = source.events.find(
    (event) => event.kind === "microphone-track-ended" && event.value === microphone.id,
  );
  if (
    lastAudioWindow === undefined ||
    !lastAudioWindow.value.startsWith("a1:") ||
    admitted?.kind !== "mixer-connected" ||
    admitted.at > lastAudioWindow.at ||
    detached?.kind !== "mixer-disconnected" ||
    detached.at > encoderStop ||
    micEnded === undefined ||
    micEnded.at < cutoff ||
    micEnded.at > encoderStop
  )
    throw blocked("the recorder microphone's last marked audio window did not span cutoff");

  const intendedCameraMs = lastCamera.at - start;
  // Unlike an instantaneous camera frame, the identified microphone tone continues
  // through this window until the mixer disconnects it at accepted Stop.
  const intendedMicrophoneMs = cutoff - start;
  const decoded = await library(a, f, "complete", "rc-4-short", cutoff + 20_000);
  if (
    decoded.video.a0 === 0 ||
    decoded.video.a1 === 0 ||
    decoded.audio.a0 === 0 ||
    decoded.audio.a1 === 0
  ) {
    throw blocked(
      "short clip positive control did not resolve early and late markers on both tracks",
    );
  }
  const video = {
    early: decoded.video.a0 > 0,
    late: decoded.video.a1 > 0,
    progressing: decoded.videoProgress.a0 > 1 && decoded.videoProgress.a1 > 1,
    decodedEndMs: decoded.videoEndMs,
  };
  const audio = {
    early: decoded.audio.a0 > 0,
    late: decoded.audio.a1 > 0,
    progressing: decoded.audio.a0 > 0 && decoded.audio.a1 > 0,
    decodedEndMs: decoded.audioEndMs,
  };
  await attachJson(f.testInfo, "rc-4-short-coverage.json", {
    encoderStart,
    start,
    cutoff,
    microphoneWindowStart: lastAudioWindow.at,
    microphoneDisconnected: detached.at,
    microphoneEnded: micEnded.at,
    intendedCameraMs,
    intendedMicrophoneMs,
    video,
    audio,
  });
  expect(completenessRejection(intendedCameraMs, video, audio, intendedMicrophoneMs)).toBeNull();
}

async function unusable(f: Fixtures, mode: "zero" | "header"): Promise<void> {
  const a = await solo(f);
  await configureOutcomeBrowser(
    a.page,
    mode === "zero" ? { deliverChunks: 0 } : { headerOnly: true },
  );
  await recordWith(a, []);
  await waitForEvents(a.page, mode === "zero" ? "encoder-chunk-suppressed" : "writer-header-only");
  await stopRecording(a.page);
  const receipt = eventOf(await waitForEvents(a.page, "writer-closed"), "writer-closed");
  const notice = await failureNotice(a.page);
  const events = await readOutcomeBrowser(a.page);
  const cutoff = eventOf(events, "action-stop").at;
  expect(notice.at, "notice follows accepted Stop").toBeGreaterThanOrEqual(cutoff);
  expect(
    notice.at - receipt.at,
    "failure notice within 1000 ms of final bytes or zero-byte receipt",
  ).toBeLessThanOrEqual(1000);
  expect(
    events.filter(
      ({ kind }) =>
        kind === "encoder-error" || kind === "writer-failing" || kind === "writer-failed",
    ),
    "native encoder and writer reported no failure",
  ).toEqual([]);

  const fileName = await recordingFileName(a.page);
  const bytes = await readRecordedFile(a.page, fileName);
  if (mode === "zero") {
    expect(receipt.bytes, "writer independently reports no stored media").toBe(0);
    expect(bytes.bytes, "OPFS file has no bytes").toBe(0);
  } else {
    const file = Buffer.from(await recordedFileBytes(a.page, fileName));
    const path = f.testInfo.outputPath("rc-4-webm-header-only.webm");
    const header = eventOf(events, "writer-header-only");
    expect(file.length).toBe(header.bytes);
    expect(file.subarray(0, 4).toString("hex")).toBe("1a45dfa3");
    expect(file.indexOf(Buffer.from("1f43b675", "hex"))).toBe(-1);
    await writeFile(path, file);
    await f.testInfo.attach("rc-4-webm-header-only.webm", { path, contentType: "video/webm" });
    try {
      const { stdout } = await run("/opt/homebrew/bin/ffprobe", [
        "-v",
        "error",
        "-show_packets",
        "-of",
        "json",
        path,
      ]);
      expect((JSON.parse(stdout) as { packets?: unknown[] }).packets ?? []).toEqual([]);
    } catch (error) {
      const failure = error as { code?: number | string; stderr?: string };
      if (failure.code !== 1 || !/End of file|Invalid data|prematurely/i.test(failure.stderr ?? ""))
        throw error;
      await attachJson(f.testInfo, "rc-4-header-decoder-rejected.json", { stderr: failure.stderr });
    }
  }
  await attachJson(f.testInfo, "rc-4-unusable.json", { mode, cutoff, notice, receipt, bytes });
  await openLibraryAfterLeaving(a.page);
  await expectLibraryCondition(a.page, "unusable");
}

function compareNotice(events: readonly OutcomeEvent[], recognized: number, held: boolean): void {
  const notice = eventOf(events, "failure-notice");
  const writerFinished = events.find(
    ({ kind }) => kind === "writer-closed" || kind === "writer-failed",
  );
  if (held) expect(writerFinished, "writer is still held after the notice").toBeUndefined();
  expect(
    noticeRejection({
      recognized,
      notice: notice.at,
      completion: held ? writerFinished?.at : undefined,
    }),
  ).toBeNull();
}

async function stalled(f: Fixtures): Promise<void> {
  const a = await solo(f);
  await configureOutcomeBrowser(a.page, { deliverChunks: 2, holdClose: true });
  await recordWith(a, []);
  await twoChunks(a.page);
  const initial = await readOutcomeBrowser(a.page);
  const healthy = initial.filter(({ kind }) => kind === "encoder-chunk");
  const [, last] = healthy;
  if (healthy.length !== 2 || last === undefined)
    throw blocked("stall requires two consecutive healthy encoder chunks");
  const firstSuppressed = eventOf(
    await waitForEvents(a.page, "encoder-chunk-suppressed"),
    "encoder-chunk-suppressed",
  );
  expect(firstSuppressed.at, "fixture stalls after two delivered slices").toBeGreaterThan(last.at);
  await failureNotice(a.page, 3000);
  await waitForEvents(a.page, "writer-close-request");
  const events = await readOutcomeBrowser(a.page);
  const detection = eventOf(events, "encoder-stop-called");
  const source = await readBrowserMedia(a.page);
  for (const kind of ["source-frame", "source-audio-window"]) {
    if (
      !source.events.some(
        (event) => event.kind === kind && event.at > firstSuppressed.at && event.at < detection.at,
      )
    ) {
      throw blocked(`no independent ${kind} progression during stalled encoder delivery`);
    }
  }
  expect(
    detection.at - last.at,
    "detect the stall within three seconds of the healthy chunk",
  ).toBeLessThanOrEqual(3000);
  expect(detection.at, "detection follows fault onset").toBeGreaterThan(firstSuppressed.at);
  compareNotice(events, detection.at, true);
  await releaseOutcomeWriter(a.page);
  await waitForEvents(a.page, "writer-closed");
  playablePrefix(await library(a, f, "incomplete", "rc-4-stalled-partial"));
}

async function faultOrder(f: Fixtures, order: "stop-first" | "failure-first"): Promise<void> {
  const a = await solo(f);
  await configureOutcomeBrowser(a.page, {
    holdStop: true,
    holdClose: true,
    failOnStopClick: order === "failure-first",
  });
  await recordWith(a, []);
  await twoChunks(a.page);
  await a.page.getByTestId(RECORDING.control).click();
  if (order === "stop-first") await injectEncoderFailure(a.page);
  await failureNotice(a.page);
  const beforeDrain = await readOutcomeBrowser(a.page);
  const stop = eventOf(beforeDrain, "action-stop");
  const failure = eventOf(beforeDrain, "fault-encoder");
  await expect(a.page.getByTestId(RECORDING.control)).toHaveAttribute("data-state", "off");
  if (order === "stop-first") expect(stop.at).toBeLessThan(failure.at);
  else expect(failure.at).toBeLessThanOrEqual(stop.at);
  compareNotice(beforeDrain, failure.at, true);
  await releaseOutcomeEncoder(a.page);
  await waitForEvents(a.page, "writer-close-request");
  compareNotice(await readOutcomeBrowser(a.page), failure.at, true);
  await releaseOutcomeWriter(a.page);
  await waitForEvents(a.page, "writer-closed");
  const afterDrain = await readOutcomeBrowser(a.page);
  expect(
    afterDrain.filter(({ kind }) => kind === "encoder-start"),
    "the original Stop press did not start another encoder",
  ).toHaveLength(1);
  playablePrefix(await library(a, f, "incomplete", `rc-4-${order}-partial`));
}

async function quota(f: Fixtures): Promise<void> {
  const a = await solo(f);
  await configureOutcomeBrowser(a.page, { deliverChunks: 2 });
  await recordWith(a, []);
  await twoChunks(a.page);
  const knownPrefix = await writerPrefix(a.page);
  expect(knownPrefix.bytes, "known prefix contains prior complete writes").toBeGreaterThan(0);
  await exhaustNextWriterAppend(a.page);
  await configureOutcomeBrowser(a.page, { deliverChunks: Number.MAX_SAFE_INTEGER });
  const failure = eventOf(await waitForEvents(a.page, "writer-failing"), "writer-failing");
  const final = eventOf(await waitForEvents(a.page, "writer-failed"), "writer-failed");
  expect(failure.detail, "writer observed native quota failure").toBe("quota-exceeded");
  expect(final.bytes, "worker keeps the prior bytes").toBe(knownPrefix.bytes);
  await failureNotice(a.page);
  compareNotice(await readOutcomeBrowser(a.page), failure.at, false);
  const stored = await readRecordedFile(a.page, await recordingFileName(a.page));
  await attachJson(f.testInfo, "rc-4-quota-prefix.json", { knownPrefix, stored, failure, final });
  expect(stored, "real OPFS bytes match the independently tapped known prefix").toEqual(
    knownPrefix,
  );
  playablePrefix(await library(a, f, "incomplete", "rc-4-quota-partial"));
}

export function registerFileOutcomeCases(): void {
  test("RC-4 rejects missing and finalization-delayed failure notices", CONTROL, async () => {
    const testInfo = test.info();
    const timely = { recognized: 100, notice: 125, completion: 800 };
    const missing = { ...timely, notice: undefined };
    const afterWriter = { ...timely, notice: 825 };
    const tooLate = { ...timely, notice: 1200, completion: 1300 };
    await attachJson(testInfo, "rc-4-notice-controls.json", {
      timely,
      missing,
      afterWriter,
      tooLate,
    });
    expect(noticeRejection(timely)).toBeNull();
    expect(noticeRejection(missing)).toBe("failure notice missing");
    expect(noticeRejection(afterWriter)).toBe("failure notice stayed behind writer finalization");
    expect(noticeRejection(tooLate)).toBe("failure notice outside 1000 ms");
  });

  test(
    "RC-4 rejects Complete for zero media, header-only, and encoded frozen video over full audio",
    CONTROL,
    async () => {
      const testInfo = test.info();
      const advancing = { early: true, late: true, progressing: true, decodedEndMs: 800 };
      const noSamples = { early: false, late: false, progressing: false, decodedEndMs: 0 };
      const frozen = await encodedControl(testInfo, "clean");
      if (frozen.video.a0 === 0 || frozen.audio.a0 < 3 || frozen.audioEndMs < 600) {
        throw blocked(
          "encoded frozen-video control did not preserve full-length detectable audio and visible video",
        );
      }
      const frozenTrack = {
        ...advancing,
        progressing: frozen.videoProgress.a0 > 1,
        decodedEndMs: frozen.videoEndMs,
      };
      expect(completenessRejection(800, advancing, advancing)).toBeNull();
      expect(completenessRejection(800, noSamples, noSamples)).toBe(
        "missing advancing early/late video markers",
      );
      expect(completenessRejection(800, frozenTrack, advancing)).toBe(
        "missing advancing early/late video markers",
      );
    },
  );

  const cases: ReadonlyArray<[string, (fixture: Fixtures) => Promise<void>]> = [
    ["an intentionally short marked clip remains complete", shortComplete],
    [
      "advancing source with frozen encoded video and continuing audio is incomplete",
      (f) => recordedVideoProgress(f, "frozen-output"),
    ],
    [
      "an intentionally still source with usable audio remains complete",
      (f) => recordedVideoProgress(f, "still-source"),
    ],
    ["zero usable media without an error shows failure", (f) => unusable(f, "zero")],
    ["header-only output cannot be marked complete", (f) => unusable(f, "header")],
    ["encoder stall shows failure promptly and retains playable partial", stalled],
    [
      "Stop before encoder failure still shows failure during finalization",
      (f) => faultOrder(f, "stop-first"),
    ],
    [
      "encoder failure before Stop still shows failure during finalization",
      (f) => faultOrder(f, "failure-first"),
    ],
    ["storage quota preserves exact written prefix as incomplete", quota],
  ];
  for (const [name, execute] of cases) {
    test(`RC-4 ${name}`, SCENARIO, async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(120_000);
      const people: Participant[] = [];
      try {
        await execute({ browser, baseURL, testInfo, people });
      } finally {
        await closeOutcomeParticipants(people, testInfo);
      }
    });
  }
}
