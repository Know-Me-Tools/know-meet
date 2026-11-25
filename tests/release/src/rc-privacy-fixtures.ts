import { type Browser, expect, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import { leave } from "./meeting-flow.ts";
import { installOutcomeBrowser, readOutcomeBrowser } from "./rc-outcomes-browser.ts";
import { installConsentFault } from "./rc-privacy-consent.ts";
import { type DecodedMarkers, decodeLibraryRecording } from "./rc-privacy-decode.ts";
import {
  installPrivacyMedia,
  type MarkerId,
  type MarkerPerson,
  readBrowserMedia,
  receivedTone,
  receivedVideo,
  setPrivacyMicHold,
} from "./rc-privacy-media.ts";
import { blocked } from "./release-env.ts";
import { ROOM } from "./test-ids.ts";
import { reachNavigation } from "./wc-nav.ts";
import { answerConsent, expectIndicator, requestRecording } from "./wc-recording.ts";
import {
  closeAll,
  expectRemoteCount,
  joinRoom,
  newParticipant,
  type Participant,
  startRoom,
} from "./wc-room.ts";
import { RECORDING, SHARE } from "./wc-test-ids.ts";

export async function markedRoom(
  browser: Browser,
  testInfo: TestInfo,
  people: readonly MarkerPerson[],
  body: (members: Participant[]) => Promise<void>,
): Promise<void> {
  const members: Participant[] = [];
  try {
    for (const person of people) {
      const participant = await newParticipant(browser, `Marker ${person}`, testInfo);
      members.push(participant);
      await installPrivacyMedia(participant.context, person);
      await installOutcomeBrowser(participant.context);
      if (person === "C") await installConsentFault(participant.context);
    }
    await body(members);
  } finally {
    try {
      for (const participant of members) {
        const browserWitness = await readBrowserMedia(participant.page).catch(() => undefined);
        const recordingWitness = await readOutcomeBrowser(participant.page).catch(() => undefined);
        if (browserWitness === undefined || recordingWitness === undefined) continue;
        await attachJson(
          testInfo,
          `${participant.name.toLowerCase().replace(" ", "-")}-privacy-edge.json`,
          {
            browserWitness,
            recordingWitness,
          },
        );
      }
    } finally {
      await closeAll(members);
    }
  }
}

export function otherTile(page: Page, person: Participant) {
  return page.getByTestId(ROOM.remoteTile).filter({ hasText: person.name });
}

export async function micAt(
  receiver: Participant,
  sender: Participant,
  id: MarkerId,
): Promise<string> {
  const locator = otherTile(receiver.page, sender).getByTestId(ROOM.remoteAudio);
  let received = "";
  await expect
    .poll(
      async () => {
        if ((await locator.count()) !== 1) return false;
        const result = await receivedTone(locator, id);
        if (result.present) received = result.trackId;
        return result.present;
      },
      { message: `${receiver.name} receives ${sender.name} marked meeting microphone` },
    )
    .toBe(true);
  return received;
}

export async function videoAt(
  receiver: Participant,
  sender: Participant,
  id: MarkerId,
): Promise<void> {
  const locator = otherTile(receiver.page, sender).getByTestId(ROOM.remoteVideo);
  await expect
    .poll(async () => (await locator.count()) === 1 && (await receivedVideo(locator, id)), {
      message: `${receiver.name} receives ${sender.name} marked meeting camera`,
    })
    .toBe(true);
}

export async function shareAt(
  receiver: Participant,
  id: MarkerId,
  audioId: MarkerId,
): Promise<string> {
  const video = receiver.page.getByTestId(SHARE.video);
  const audio = receiver.page.getByTestId("km-screen-share-audio");
  await expect
    .poll(async () => (await video.count()) === 1 && (await receivedVideo(video, id)), {
      message: "ordinary participant receives the live share video marker",
    })
    .toBe(true);
  let trackId = "";
  await expect
    .poll(
      async () => {
        if ((await audio.count()) !== 1) return false;
        const received = await receivedTone(audio, audioId);
        if (received.present) trackId = received.trackId;
        return received.present;
      },
      { message: "ordinary participant receives the live share audio marker" },
    )
    .toBe(true);
  return trackId;
}

export async function observedOutcome(page: Page, kind: string, timeout = 8_000) {
  try {
    await expect
      .poll(async () => (await readOutcomeBrowser(page)).some((event) => event.kind === kind), {
        timeout,
      })
      .toBe(true);
  } catch {
    throw blocked(`browser observer did not witness ${kind}`);
  }
  const event = (await readOutcomeBrowser(page)).findLast((entry) => entry.kind === kind);
  if (event === undefined) throw blocked(`browser observer lost ${kind}`);
  return event;
}

export async function starting(a: Participant, b: Participant, held: boolean): Promise<string> {
  const code = await startRoom(a);
  await joinRoom(b, code);
  await expectRemoteCount(a.page, 1, "recorder sees the agreeing participant");
  await videoAt(a, b, "b0");
  await micAt(b, a, "a0");
  await setPrivacyMicHold(a.page, held ? "arm" : "observe");
  await requestRecording(a.page);
  await answerConsent(b.page, true);
  return code;
}

export async function preCutoff(a: Participant, b: Participant): Promise<void> {
  await observedOutcome(a.page, "encoder-start");
  await expectIndicator(a.page, true, "recorder indicator on");
  await expectIndicator(b.page, true, "peer indicator on");
  await observedOutcome(a.page, "encoder-chunk");
  const browser = await readBrowserMedia(a.page);
  expect(
    browser.events.filter(
      (entry) => entry.kind === "compositor-frame" && entry.value.startsWith("a0:"),
    ).length,
  ).toBeGreaterThan(1);
  expect(
    browser.events.filter(
      (entry) => entry.kind === "compositor-frame" && entry.value.startsWith("b0:"),
    ).length,
  ).toBeGreaterThan(1);
}

export async function libraryClip(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<DecodedMarkers> {
  if ((await page.getByTestId(ROOM.localTile).count()) !== 0) await leave(page);
  await reachNavigation(page);
  await page.getByTestId(RECORDING.nav).click();
  return decodeLibraryRecording(page, testInfo, name);
}

export function requireMarkers(decoded: DecodedMarkers, ids: readonly MarkerId[]): void {
  for (const id of ids) {
    expect(decoded.video[id], `${id}: independently decoded video marker`).toBeGreaterThan(0);
    expect(decoded.videoProgress[id], `${id}: advancing frames`).toBeGreaterThan(1);
    expect(decoded.audio[id], `${id}: independently decoded 200 ms audio marker`).toBeGreaterThan(
      0,
    );
  }
}

export async function requireRecorderMicEnded(page: Page, acceptedAt: number): Promise<void> {
  const witness = await readBrowserMedia(page);
  const id = witness.heldMicrophones[0]?.id;
  if (id === undefined) throw blocked("recorder-only microphone identity was not observed");
  const enteredMixer = witness.events.find(
    (event) => event.kind === "mixer-connected" && event.value === id,
  );
  if (enteredMixer === undefined)
    throw blocked("microphone acquisition could not be matched to the recording mixer");
  const end = witness.events.find(
    (event) => event.kind === "microphone-track-ended" && event.value === id,
  );
  expect(end, "recording microphone ends by the checkpoint inside the hold").toBeDefined();
  if (end === undefined) return;
  expect(
    end.at - acceptedAt,
    "recording microphone ends within 1000 ms of cutoff",
  ).toBeLessThanOrEqual(1000);
  expect(end.at, "recording microphone was live until cutoff").toBeGreaterThanOrEqual(acceptedAt);
}
