import { type Browser, expect, type Page, type TestInfo, test } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { expectInRoom } from "./meeting-flow.ts";
import {
  browserCaptureTracks,
  configureOutcomeBrowser,
  installOutcomeBrowser,
  type OutcomeEvent,
  readOutcomeBrowser,
  releaseOutcomeWriter,
  TRACK_STOP_TRACE,
  watchCaptureTrackIds,
} from "./rc-outcomes-browser.ts";
import {
  attachOutcomeEvidence,
  departureRejection,
  eventOf,
  waitForEvents,
} from "./rc-outcomes-oracles.ts";
import { matchingConsentReceipt, runningChallenge } from "./rc-privacy-consent.ts";
import { decodeLibraryRecording } from "./rc-privacy-decode.ts";
import {
  installPrivacyMedia,
  type MarkerId,
  type MarkerPerson,
  readBrowserMedia,
  receivedTone,
  receivedVideo,
  setMarkerPhase,
} from "./rc-privacy-media.ts";
import { blocked } from "./release-env.ts";
import { HOME, ROOM } from "./test-ids.ts";
import {
  answerConsent,
  expectIndicator,
  openLibraryAfterLeaving,
  requestRecording,
  stopRecording,
} from "./wc-recording.ts";
import type { Participant } from "./wc-room.ts";
import {
  closeAll,
  contextDefaults,
  finishJoin,
  joinRoom,
  newParticipant,
  startRoom,
} from "./wc-room.ts";
import { RECORDING } from "./wc-test-ids.ts";

const TAGS = ["@packaged-only", "@value-critical", "@RC-3"];
const CONTROL = { tag: [...TAGS, "@rc-control"] };
const SCENARIO = { tag: TAGS };
const DEVICES_ON = { mic: true, camera: true };

export interface Fixtures {
  readonly browser: Browser;
  readonly baseURL: string | undefined;
  readonly testInfo: TestInfo;
  readonly people: Participant[];
}

export async function outcomeParticipant(f: Fixtures, person: MarkerPerson): Promise<Participant> {
  const participant = await newParticipant(f.browser, `Recorder fixture ${person}`, f.testInfo, {
    contextOptions: {
      ...contextDefaults(f.baseURL),
      acceptDownloads: true,
      recordVideo: { dir: f.testInfo.outputPath(`rc-video-${person.toLowerCase()}`) },
    },
  });
  f.people.push(participant);
  await installOutcomeBrowser(participant.context);
  await installPrivacyMedia(participant.context, person);
  return participant;
}

export async function closeOutcomeParticipants(
  people: readonly Participant[],
  testInfo: TestInfo,
): Promise<void> {
  try {
    await Promise.all(people.map(({ page, name }) => attachOutcomeEvidence(testInfo, page, name)));
  } finally {
    await closeAll(people);
  }
  for (const { page, name } of people) {
    const video = page.video();
    if (video !== null) {
      await testInfo.attach(`${name} room video`, {
        path: await video.path(),
        contentType: "video/webm",
      });
    }
  }
}

export async function recordWith(
  recorder: Participant,
  peers: readonly Participant[],
): Promise<void> {
  await requestRecording(recorder.page);
  for (const peer of peers) await answerConsent(peer.page, true);
  await Promise.all(
    [recorder, ...peers].map(({ page, name }) =>
      expectIndicator(page, true, `${name} sees active recording`),
    ),
  );
}

export async function twoChunks(page: Page): Promise<void> {
  await waitForEvents(page, "encoder-chunk", 2);
  await waitForEvents(page, "writer-append", 2);
}

async function leaveAction(page: Page): Promise<void> {
  await page.getByTestId(ROOM.leave).click();
  const confirm = page.getByTestId(ROOM.leaveConfirm);
  if (await confirm.isVisible()) await confirm.click();
}

async function observeMedia(receiver: Page, marker: MarkerId): Promise<void> {
  const remote = receiver.getByTestId(ROOM.remoteTile).first();
  const video = remote.getByTestId(ROOM.remoteVideo);
  const audio = remote.getByTestId(ROOM.remoteAudio);
  await expect
    .poll(async () => (await video.count()) > 0 && (await receivedVideo(video, marker)), {
      timeout: 8_000,
      message: `remote receives ${marker} camera pixels`,
    })
    .toBe(true);
  await expect
    .poll(async () => (await audio.count()) > 0 && (await receivedTone(audio, marker)).present, {
      timeout: 8_000,
      message: `remote receives ${marker} microphone tone`,
    })
    .toBe(true);
}

async function watchOwnedTracks(a: Participant): Promise<string[]> {
  const encoder = (await browserCaptureTracks(a.page)).filter(
    (track) => track.readyState === "live",
  );
  const remoteIds = await a.page.getByTestId(ROOM.remoteAudio).evaluateAll((elements) =>
    elements.flatMap((element) => {
      const stream = (element as HTMLAudioElement).srcObject;
      return stream instanceof MediaStream ? stream.getAudioTracks().map((track) => track.id) : [];
    }),
  );
  const local = (await readBrowserMedia(a.page)).mixerTracks.filter(
    (track) => track.state === "live" && !remoteIds.includes(track.id),
  );
  if (encoder.length !== 2 || local.length !== 1) {
    throw blocked("could not independently identify composite output tracks and recorder-only mic");
  }
  const ids = [...encoder, ...local].map((track) => track.id);
  await watchCaptureTrackIds(a.page, ids);
  return ids;
}

function requireWithin(start: number, observation: number, bound: number, label: string): void {
  expect(observation - start, label).toBeGreaterThanOrEqual(0);
  expect(observation - start, label).toBeLessThanOrEqual(bound);
}

function requireHeld(events: readonly OutcomeEvent[]): void {
  eventOf(events, "writer-close-request");
  expect(
    events.filter(({ kind }) => kind === "writer-closed" || kind === "writer-close-release"),
    "native writer completion stays held",
  ).toEqual([]);
}

function membership(
  entries: readonly OutcomeEvent[],
  identity: string,
  present: boolean,
  after: number,
): number {
  const match = entries.find(
    (event) =>
      event.kind === "remote-membership" &&
      event.at >= after &&
      (event.detail ?? "").split(",").includes(identity) === present,
  );
  if (match === undefined) throw blocked("independent receiving peer membership timing missing");
  return match.at;
}

async function remoteIdentity(page: Page): Promise<string> {
  const identity = await page
    .getByTestId(ROOM.remoteTile)
    .first()
    .getAttribute("data-participant-identity");
  if (!identity) throw blocked("the independently receiving peer has no remote identity");
  return identity;
}

async function registerCutoff(f: Fixtures, trigger: "Stop" | "decline"): Promise<void> {
  const a = await outcomeParticipant(f, "A");
  const b = await outcomeParticipant(f, "B");
  const code = await startRoom(a);
  await joinRoom(b, code);
  await configureOutcomeBrowser(a.page, { holdClose: true });
  await recordWith(a, [b]);
  await twoChunks(a.page);
  const tracks = await watchOwnedTracks(a);
  let cutoff: number;
  if (trigger === "Stop") {
    await stopRecording(a.page);
    cutoff = eventOf(await readOutcomeBrowser(a.page), "action-stop").at;
  } else {
    const c = await outcomeParticipant(f, "C");
    await joinRoom(c, code);
    await expectIndicator(c.page, true, "late participant sees the active indicator");
    const challenge = await runningChallenge(c.page);
    await answerConsent(c.page, false);
    await expectIndicator(a.page, false, "matching decline clears recorder status");
    cutoff = await matchingConsentReceipt(a.page, challenge, "declined");
  }
  await expectIndicator(a.page, false, "local status cleared");
  await expectIndicator(b.page, false, "remote status cleared");
  await waitForEvents(a.page, "writer-close-request");
  const localEvents = await readOutcomeBrowser(a.page);
  const remoteEvents = await readOutcomeBrowser(b.page);
  await attachJson(f.testInfo, "rc-3-cutoff.json", { cutoff, localEvents, remoteEvents });
  requireHeld(localEvents);
  requireWithin(cutoff, eventOf(localEvents, "indicator-off").at, 1000, "local indicator");
  requireWithin(cutoff, eventOf(remoteEvents, "indicator-off").at, 2000, "remote indicator");
  for (const id of tracks) {
    const ended = localEvents.find(
      (event) => event.kind === "capture-track-stop" && event.detail === id,
    );
    if (ended === undefined) throw new Error(`recording-owned track ${id} did not shut down`);
    requireWithin(cutoff, ended.at, 1000, "recording-owned track");
  }
  await releaseOutcomeWriter(a.page);
  await waitForEvents(a.page, "writer-closed", 1, 20_000);
}

async function rejoinWhileSaving(f: Fixtures): Promise<void> {
  const a = await outcomeParticipant(f, "A");
  const b = await outcomeParticipant(f, "B");
  const c = await outcomeParticipant(f, "C");
  const oldCode = await startRoom(a);
  await joinRoom(b, oldCode);
  const newCode = await startRoom(c);
  const originalIdentity = await remoteIdentity(b.page);
  await configureOutcomeBrowser(a.page, { holdClose: true });
  await recordWith(a, [b]);
  await twoChunks(a.page);
  const oldFile = eventOf(await readOutcomeBrowser(a.page), "writer-open-request").detail;
  if (oldFile === undefined) throw blocked("old recording file identity is unavailable");
  const oldId = oldFile.replace(/\.[^.]+$/, "");
  await leaveAction(a.page);
  await expect(b.page.getByTestId(ROOM.remoteTile)).toHaveCount(0, { timeout: 2000 });
  await waitForEvents(a.page, "writer-close-request");
  requireHeld(await readOutcomeBrowser(a.page));
  const leave = (await readOutcomeBrowser(a.page))
    .filter(({ kind }) => kind === "action-leave")
    .at(-1);
  if (leave === undefined) throw blocked("recorder Leave was not observed");
  const disconnect = membership(
    await readOutcomeBrowser(b.page),
    originalIdentity,
    false,
    leave.at,
  );

  await a.page.getByRole("button", { name: "Rejoin", exact: true }).click();
  await finishJoin(a.page, a.name, oldCode, DEVICES_ON);
  await observeMedia(b.page, "a0");
  const submission = (await readOutcomeBrowser(a.page))
    .filter(({ kind }) => kind === "action-join")
    .at(-1);
  if (submission === undefined) throw blocked("rejoin submission was not observed");
  const usable = await b.page.evaluate(() => performance.timeOrigin + performance.now());
  await leaveAction(a.page);
  await expect(b.page.getByTestId(ROOM.remoteTile)).toHaveCount(0, { timeout: 2000 });
  await a.page.getByRole("link", { name: "Home", exact: true }).click();
  await a.page.getByTestId(HOME.joinCode).fill(newCode);
  await a.page.getByTestId(HOME.join).click();
  await finishJoin(a.page, a.name, newCode, DEVICES_ON);
  await observeMedia(c.page, "a0");
  await recordWith(a, [c]);
  requireHeld(await readOutcomeBrowser(a.page));

  await releaseOutcomeWriter(a.page);
  await waitForEvents(a.page, "writer-closed", 1, 20_000);
  await expect
    .poll(
      async () =>
        (await readOutcomeBrowser(a.page)).filter(
          (event) => event.kind === "recording-index-changed" && event.detail === oldId,
        ).length,
      { timeout: 20_000, message: "old recording index is finalized while new room is active" },
    )
    .toBe(2);
  const timeline = await readOutcomeBrowser(a.page);
  await expectInRoom(a.page, newCode);
  await setMarkerPhase(a.page, 1);
  await observeMedia(c.page, "a1");
  const indicators = await Promise.all(
    [a, c].map(({ page }) => page.getByTestId(RECORDING.indicator).isVisible()),
  );
  const oldFinished = timeline
    .filter((event) => event.kind === "recording-index-changed" && event.detail === oldId)
    .at(-1);
  if (oldFinished === undefined) throw new Error("old recording index completion is missing");
  const trace = {
    leave: leave.at,
    disconnect,
    submission: submission.at,
    usable,
    writerReleased: eventOf(timeline, "writer-close-release").at,
    oldFinished: oldFinished.at,
    newRoomUsableAfterOld: indicators.every(Boolean),
  };
  await attachJson(f.testInfo, "rc-3-rejoin.json", { trace, oldCode, newCode, timeline });
  expect(departureRejection(trace)).toBeNull();
  await stopRecording(a.page);
  await openLibraryAfterLeaving(a.page);
  const oldEntry = a.page
    .getByTestId(RECORDING.item)
    .and(a.page.locator(`[data-recording-id="${oldId}"]`));
  await expect(oldEntry).toBeVisible({ timeout: 20_000 });
  await oldEntry.click();
  await expect(a.page.getByTestId(RECORDING.player)).toBeVisible();
}

async function peerDeparture(f: Fixtures): Promise<void> {
  const a = await outcomeParticipant(f, "A");
  const b = await outcomeParticipant(f, "B");
  const c = await outcomeParticipant(f, "C");
  const code = await startRoom(a);
  await joinRoom(b, code);
  await joinRoom(c, code);
  await recordWith(a, [b, c]);
  await twoChunks(a.page);
  const tile = a.page.getByTestId(ROOM.remoteTile).filter({ hasText: b.name });
  const identity = await tile.getAttribute("data-participant-identity");
  const microphone = await tile.getByTestId(ROOM.remoteAudio).evaluate((element) => {
    const stream = (element as HTMLAudioElement).srcObject;
    return stream instanceof MediaStream ? stream.getAudioTracks()[0]?.id : undefined;
  });
  if (!identity || !microphone) throw blocked("departing peer identity or microphone unavailable");
  await leaveAction(b.page);
  await expect(c.page.getByTestId(ROOM.remoteTile)).toHaveCount(1, { timeout: 2000 });
  await expect(a.page.getByTestId(ROOM.remoteTile)).toHaveCount(1, { timeout: 2000 });
  const leave = eventOf(await readOutcomeBrowser(b.page), "action-leave").at;
  const removed = membership(await readOutcomeBrowser(a.page), identity, false, leave);
  await setMarkerPhase(c.page, 1);
  await observeMedia(a.page, "c1");
  await waitForEvents(a.page, "encoder-chunk", 4);
  await expectIndicator(c.page, true, "surviving eligible peer still sees recording");
  await stopRecording(a.page);
  const stop = eventOf(await readOutcomeBrowser(a.page), "action-stop").at;
  const { events } = await readBrowserMedia(a.page);
  const edges = events.filter(
    ({ kind, value }) =>
      value === microphone && (kind === "mixer-connected" || kind === "mixer-disconnected"),
  );
  const lastBeforeRemoval = edges.findLast(({ at }) => at <= removed);
  const lingering = events.filter(
    ({ at, kind, value }) =>
      at > removed &&
      at < stop &&
      ((kind === "compositor-label" && value.includes(b.name)) ||
        (kind === "compositor-frame" && /^(b0|b1):/.test(value)) ||
        (kind === "mixer-connected" && value === microphone)),
  );
  await attachJson(f.testInfo, "rc-3-peer-departure-edges.json", {
    leave,
    removed,
    stop,
    edges,
    lingering,
  });
  expect(stop, "recording continues after the departing peer is removed").toBeGreaterThan(removed);
  expect(
    edges.some(({ at, kind }) => at < leave && kind === "mixer-connected"),
    "departing microphone was mixed before Leave",
  ).toBe(true);
  expect(lastBeforeRemoval?.kind, "departing microphone detached by membership removal").toBe(
    "mixer-disconnected",
  );
  expect(lingering, "removed peer supplies no compositor identity, video, or mixer input").toEqual(
    [],
  );
  await openLibraryAfterLeaving(a.page);
  const decoded = await decodeLibraryRecording(a.page, f.testInfo, "rc-3-peer-departure");
  if (
    decoded.video.c0 === 0 ||
    decoded.audio.c0 === 0 ||
    decoded.video.b0 === 0 ||
    decoded.audio.b0 === 0
  ) {
    throw blocked("recording did not independently resolve the pre-departure media controls");
  }
  expect(decoded.video.c1, "surviving peer camera is retained after departure").toBeGreaterThan(0);
  expect(decoded.audio.c1, "surviving peer audio is retained after departure").toBeGreaterThan(0);
}

async function tabDeparture(f: Fixtures): Promise<void> {
  const a = await outcomeParticipant(f, "A");
  const b = await outcomeParticipant(f, "B");
  const code = await startRoom(a);
  await joinRoom(b, code);
  await recordWith(a, [b]);
  await twoChunks(a.page);
  const captureIds = await watchOwnedTracks(a).catch(() => []);
  const nativeStops: { id: string; kind: string; state: string }[] = [];
  a.page.on("console", (message) => {
    const line = message.text();
    if (line.startsWith(TRACK_STOP_TRACE)) {
      nativeStops.push(
        JSON.parse(line.slice(TRACK_STOP_TRACE.length)) as (typeof nativeStops)[number],
      );
    }
  });
  const target = await a.context.newCDPSession(a.page);
  const { targetInfo } = await target.send("Target.getTargetInfo");
  const browser = await f.browser.newBrowserCDPSession();
  await browser.send("Target.setDiscoverTargets", { discover: true });
  let destroyed = false;
  browser.on("Target.targetDestroyed", ({ targetId }) => {
    if (targetId === targetInfo.targetId) destroyed = true;
  });
  await attachOutcomeEvidence(f.testInfo, a.page, "rc-3-before-tab-exit");
  try {
    await a.page.close({ runBeforeUnload: true });
    await expect
      .poll(() => destroyed, { timeout: 5000, message: "browser target destruction" })
      .toBe(true);
    await expect(b.page.getByTestId(ROOM.remoteTile)).toHaveCount(0, { timeout: 5000 });
    await expectIndicator(b.page, false, "peer observes remote recording end");
    await attachJson(f.testInfo, "rc-3-tab-teardown.json", {
      destroyed,
      captureIds,
      nativeStops,
      remote: await readOutcomeBrowser(b.page),
    });
  } finally {
    await browser.detach();
  }
}

export function registerRoomOutcomeCases(): void {
  test(
    "RC-3 rejects blocked Leave and old completion affecting the new room",
    CONTROL,
    async () => {
      const testInfo = test.info();
      const healthy = {
        leave: 100,
        disconnect: 180,
        submission: 250,
        usable: 360,
        writerReleased: 1000,
        oldFinished: 1050,
        newRoomUsableAfterOld: true,
      };
      const held = { ...healthy, disconnect: 1010 };
      const clobbered = { ...healthy, newRoomUsableAfterOld: false };
      await attachJson(testInfo, "rc-3-departure-controls.json", { healthy, held, clobbered });
      expect(departureRejection(healthy)).toBeNull();
      expect(departureRejection(held)).toBe("disconnect waited for finalization");
      expect(departureRejection(clobbered)).toBe("old completion changed the new room");
    },
  );

  const cases: ReadonlyArray<[string, (fixture: Fixtures) => Promise<void>]> = [
    [
      "Stop clears both indicators during writer hold",
      (fixture) => registerCutoff(fixture, "Stop"),
    ],
    [
      "matching decline clears both indicators during writer hold",
      (fixture) => registerCutoff(fixture, "decline"),
    ],
    ["Leave and rejoin work while the old recording saves", rejoinWhileSaving],
    ["departing peer leaves remaining eligible media in the recording", peerDeparture],
    ["tab exit destroys the target and clears peer presence and recording status", tabDeparture],
  ];
  for (const [name, execute] of cases) {
    test(`RC-3 ${name}`, SCENARIO, async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(180_000);
      const people: Participant[] = [];
      try {
        await execute({ browser, baseURL, testInfo, people });
      } finally {
        await closeOutcomeParticipants(people, testInfo);
      }
    });
  }
}
