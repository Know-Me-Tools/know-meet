import { type Browser, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { attachJson } from "./evidence.ts";
import {
  installKmtMedia,
  MARKERS,
  playPhrase,
  readKmtMedia,
  SPEECH,
  speechGpu,
  tone,
} from "./kmt-media.ts";
import { completedKmtSearch, installKmtSearchWitness } from "./kmt-search-witness.ts";
import { transcriptDatabaseNames } from "./kmt-storage.ts";
import {
  expectOneRemoteWithMedia,
  observeAudio,
  observeVideo,
  remoteTiles,
} from "./media-probes.ts";
import { expectInRoom, leave } from "./meeting-flow.ts";
import { blocked } from "./release-env.ts";
import { reachNavigation } from "./wc-nav.ts";
import { findLeaks, findRecordingEgress, type NetworkSnapshot, summarise } from "./wc-network.ts";
import {
  closeAll,
  contextDefaults,
  holdsFor,
  joinRoom,
  newParticipant,
  type Participant,
  startRoom,
} from "./wc-room.ts";
import { HISTORY } from "./wc-test-ids.ts";

export const SYNTHETIC_SPEECH = /the blue folder is ready/i;
const ASSET = /^\/capabilities\/local-speech\/[a-f0-9]{64}\//;
export const SOURCE_WAIT_MS = 4_500; // longer than one genuine 4 s PCM chunk

export const panel = (page: Page): Locator =>
  page.getByRole("region", { name: "Local transcript" });
const search = (page: Page): Locator =>
  panel(page).getByRole("searchbox", { name: "Search settled transcript" });

interface FixtureRoom {
  readonly host: Participant;
  readonly peer: Participant;
  readonly room: string;
  readonly origin: string;
  readonly started: readonly [number, number];
  readonly createLateGuest: () => Promise<Participant>;
}

export async function withKmtRoom<T>(
  browser: Browser,
  baseURL: string | undefined,
  info: TestInfo,
  run: (fixture: FixtureRoom) => Promise<T>,
): Promise<T> {
  if (
    browser.browserType().name() !== "chromium" ||
    baseURL === undefined ||
    !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
  ) {
    throw blocked("KMT requires the run-owned packaged Chromium stack, never hosted production");
  }
  const participants: Participant[] = [];
  const create = async (name: string, mark: number): Promise<Participant> => {
    const participant = await newParticipant(browser, name, info, {
      contextOptions: contextDefaults(baseURL),
    });
    participants.push(participant);
    await installKmtMedia(participant.context, mark);
    await installKmtSearchWitness(participant.context);
    return participant;
  };
  try {
    const host = await create("KMT Requester", MARKERS[0]);
    const peer = await create("KMT Speaker", MARKERS[1]);
    const joiningAt = Date.now();
    const room = await startRoom(host);
    const connectedAt = Date.now();
    await joinRoom(peer, room);
    await expectOneRemoteWithMedia(host.page, "KMT requester receives peer media");
    await expectOneRemoteWithMedia(peer.page, "KMT peer receives requester media");
    return await run({
      host,
      peer,
      room,
      origin: new URL(baseURL).origin,
      started: [joiningAt, connectedAt],
      createLateGuest: () => create("KMT Late Guest", MARKERS[2]),
    });
  } finally {
    await closeAll(participants);
  }
}

export function fetchedModels(snapshot: NetworkSnapshot, origin: string) {
  return snapshot.requests.flatMap(({ url, method }) => {
    const parsed = new URL(url);
    return ASSET.test(parsed.pathname)
      ? [{ method, origin: parsed.origin, path: parsed.pathname, expectedOrigin: origin }]
      : [];
  });
}

export async function openPanel(page: Page): Promise<void> {
  const toggle = panel(page).getByRole("button", { name: "Transcript", exact: true });
  await expect(
    toggle,
    "the production app exposes its packaged local speech profile",
  ).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(search(page)).toBeVisible();
}

export async function prepareModel(page: Page): Promise<void> {
  if (!(await speechGpu(page))) {
    throw blocked("the headed Chromium desktop exposes no WebGPU adapter with shader-f16");
  }
  const download = panel(page).getByRole("button", { name: /Download English model.*MB/ });
  await expect(download, "ready-to-download local profile discloses its size").toBeEnabled();
  await download.click();
  await expect(
    panel(page).getByText("Model ready. Ask everyone before listening."),
    "the packaged model and worker become ready",
  ).toBeVisible({
    timeout: 130_000,
  });
}

export async function requestTranscription(page: Page, retain = false): Promise<void> {
  if (retain) {
    const retention = panel(page).getByRole("checkbox", {
      name: /Ask whether a copy may be saved/,
    });
    await retention.check();
  }
  const probe = panel(page).getByRole("button", { name: "Check whether everyone can consent" });
  if (await probe.isVisible()) await probe.click();
  const ask = panel(page).getByRole("button", { name: "Ask to transcribe", exact: true });
  await expect(ask, "the real room adapter attests each peer can answer").toBeEnabled();
  await ask.click();
}

export async function allowTranscription(page: Page): Promise<void> {
  const consent = panel(page).getByRole("button", { name: "Allow local transcription" });
  await expect(
    consent,
    "peer receives a separate local-transcription consent prompt",
  ).toBeVisible();
  await consent.click();
  await expect(consent).toBeHidden();
}

export async function waitForCapture(page: Page): Promise<void> {
  await expect(panel(page).getByText("Transcribing on this device.")).toBeVisible();
  await expect
    .poll(async () => (await readKmtMedia(page)).captureNodes.length, {
      message: "the real production AudioWorklet has been bound",
    })
    .toBeGreaterThan(0);
}

export async function expectNoPrivateTranscript(page: Page): Promise<void> {
  await openPanel(page);
  const search = panel(page).getByRole("searchbox", {
    name: "Search settled transcript",
  });
  await search.fill("blue folder");
  await expect(panel(page).getByRole("button", { name: SYNTHETIC_SPEECH })).toHaveCount(0);
  await search.fill("");
  await expect(panel(page).getByText("No settled text yet.")).toBeVisible();
  await expect(panel(page).getByRole("button", { name: /Save a copy/ })).toHaveCount(0);
  expect((await readKmtMedia(page)).pcm.length, "other browser did not transcribe").toBe(0);
  expect(await transcriptDatabaseNames(page)).toEqual([]);
}

export async function withdrawAndWitnessCutoff(host: Page, peer: Page) {
  // Stimulus continues through the cutoff; the receiver's data channel timestamps
  // delivery independently of React and of the speech-worker PCM observer.
  await tone(peer, true);
  const withdrawnAt = Date.now();
  await panel(peer).getByRole("button", { name: "Withdraw permission" }).click();
  await expect.poll(async () => (await readKmtMedia(host)).withdrawals.length).toBeGreaterThan(0);
  const receivedAt = (await readKmtMedia(host)).withdrawals[0];
  if (receivedAt === undefined) throw blocked("withdrawal arrival timestamp missing");
  expect(receivedAt).toBeGreaterThanOrEqual(withdrawnAt - 2);
  await expect(panel(host).getByText(/^Paused\./)).toBeVisible();
  await holdsFor(host, SOURCE_WAIT_MS, "no PCM after the received withdrawal", async () =>
    (await readKmtMedia(host)).pcm.some(({ at }) => at >= receivedAt)
      ? "withdrawn scope transferred PCM"
      : null,
  );
  const stopped = await readKmtMedia(host);
  return { withdrawnAt, receivedAt, stopped };
}

export async function findSettledPhrase(
  fixture: FixtureRoom,
  info: TestInfo,
  evidenceName = "kmt-settled-time.json",
  expectedRemotes: 1 | 2 = 1,
): Promise<void> {
  const { host, peer, room, started } = fixture;
  const baseline = await completedKmtSearch(host.page);
  const emitted = await playPhrase(peer.page);
  await search(host.page).fill("blue folder");
  const hit = panel(host.page).getByRole("button", { name: SYNTHETIC_SPEECH }).first();
  await expect(hit, "real local model settles the exact seeded phrase").toBeVisible({
    timeout: 45_000,
  });
  const worker = await completedKmtSearch(host.page);
  expect(worker.live, "the real in-memory PGlite search worker answered").toBeGreaterThan(
    baseline.live,
  );
  await hit.click();
  const result = panel(host.page).getByRole("region", { name: "Settled transcript result" });
  await expect(result).toContainText(SYNTHETIC_SPEECH);
  await expect(result).toBeFocused();
  const duration = await result.locator("time").getAttribute("datetime");
  const seconds = duration === null ? Number.NaN : Number(/^PT([\d.]+)S$/.exec(duration)?.[1]);
  expect(Number.isFinite(seconds), "timestamp jump has a real meeting-relative time").toBe(true);
  const inferred = seconds * 1_000;
  // The app's room clock starts between opening and completing its room connection.
  // A real 4 s worklet window and the 3 s speech envelope bound the possible result.
  expect(
    emitted.some(
      (at) => inferred >= at - started[1] - 4_000 && inferred <= at - started[0] + 3_000,
    ),
    "timestamp corresponds to an independently emitted speech window",
  ).toBe(true);
  await expectInRoom(host.page, room);
  await expectInRoom(peer.page, room);
  if (expectedRemotes === 1) {
    await expectOneRemoteWithMedia(host.page, "ordinary call still receives peer audio and video");
  } else {
    const tiles = remoteTiles(host.page);
    await expect(tiles, "the original peer and late guest remain in the call").toHaveCount(2);
    for (const tile of await tiles.all()) {
      await expect
        .poll(
          async () => {
            const [audio, video] = await Promise.all([observeAudio(tile), observeVideo(tile)]);
            return (
              audio.liveAudioTrack &&
              video.liveVideoTrack &&
              video.videoWidth > 0 &&
              video.videoHeight > 0 &&
              video.boxWidth > 0 &&
              video.boxHeight > 0
            );
          },
          { message: "the remote participant still has live audio and rendered video" },
        )
        .toBe(true);
    }
  }
  const settledAt = Date.now();
  await attachJson(info, evidenceName, {
    phrase: SPEECH,
    emitted,
    beforeRoomAt: started[0],
    inRoomAt: started[1],
    settledAt,
    meetingRelativeMs: inferred,
    liveSearchWorkerReplies: worker.live - baseline.live,
  });
}

export async function openTranscriptHistory(page: Page, leaveRoom: boolean): Promise<Locator> {
  if (leaveRoom) await leave(page);
  await reachNavigation(page);
  await page.getByTestId(HISTORY.nav).click();
  await expect(page).toHaveURL(/\/history(?:#|$)/);
  const library = page.getByRole("region", { name: "Browser-local transcripts" });
  await library.getByRole("button", { name: "Open local transcripts" }).click();
  return library;
}

export async function assertLocalSpeechNetwork(
  participant: Participant,
  origin: string,
  before: NetworkSnapshot,
  info: TestInfo,
  options: { readonly requireConsentData?: boolean } = {},
): Promise<void> {
  const snapshot = await participant.net.collect();
  const allowed = new Set([origin, ...before.requests.map(({ url }) => new URL(url).origin)]);
  const model = fetchedModels(snapshot, origin);
  const browser = await readKmtMedia(participant.page);
  expect(
    snapshot.requests
      .filter(({ url }) => !allowed.has(new URL(url).origin))
      .map(({ url }) => new URL(url).origin),
    "speech does not add an external request origin",
  ).toEqual([]);
  expect(
    model.every(({ method, origin: seen }) => method === "GET" && seen === origin),
    "model fetches are same-origin reads",
  ).toBe(true);
  expect(
    findLeaks(snapshot, [SPEECH, SPEECH.toLowerCase(), "blue folder"]),
    "synthetic speech never appears in HTTP, signalling, or tapped upload bodies",
  ).toEqual([]);
  expect(findRecordingEgress(snapshot), "no raw PCM-sized or media upload is observed").toEqual([]);
  expect(browser.suspectRtc, "no raw PCM-sized or speech-bearing RTC data sends").toBe(0);
  if (options.requireConsentData) {
    expect(browser.rtcSends, "the data observer sees the actual consent operation").toBeGreaterThan(
      0,
    );
  }
  await attachJson(
    info,
    `kmt-${participant.name.toLowerCase().replaceAll(" ", "-")}-network.json`,
    {
      network: summarise(snapshot),
      model,
      rtcSends: browser.rtcSends,
      suspectRtc: browser.suspectRtc,
      publicationCount: browser.publications.length,
    },
  );
}
