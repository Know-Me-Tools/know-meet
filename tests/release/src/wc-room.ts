/**
 * Participants and room flow for the WC specs. A participant is a browser
 * context with the page taps installed (wc-taps.ts) and a network recorder
 * (wc-network.ts). Joining reuses the UI contract of the web-release suite
 * (test-ids.ts, meeting-flow.ts): home, lobby, room.
 */
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  expect,
  type Page,
  type Response,
  type TestInfo,
} from "@playwright/test";
import { API, isCreateMeetingResponse, STATUS } from "./api-contract.ts";
import { CONNECT_TIMEOUT_MS, expectInRoom, joinFromLobby } from "./meeting-flow.ts";
import { DATA_STATE, HOME, LOBBY, ROOM, SCREEN } from "./test-ids.ts";
import { type NetworkRecorder, recordNetwork } from "./wc-network.ts";
import { installTaps } from "./wc-taps.ts";

export interface Participant {
  readonly name: string;
  readonly context: BrowserContext;
  readonly page: Page;
  readonly net: NetworkRecorder;
}

export interface ParticipantOptions {
  /** Record a HAR for this participant under the test's output folder. */
  readonly har?: boolean;
  /** Passed to newContext. A browser the spec launched itself has no project defaults. */
  readonly contextOptions?: BrowserContextOptions;
}

export interface MediaChoice {
  readonly mic: boolean;
  readonly camera: boolean;
}

/** Firefox and WebKit have no fake-media flags: cross-engine tests join with devices off. */
export function mediaFor(browser: Browser): MediaChoice {
  const on = browser.browserType().name() === "chromium";
  return { mic: on, camera: on };
}

export function contextDefaults(baseURL: string | undefined): BrowserContextOptions {
  return { baseURL: baseURL ?? "", permissions: ["camera", "microphone"] };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function newParticipant(
  browser: Browser,
  name: string,
  testInfo: TestInfo,
  options: ParticipantOptions = {},
): Promise<Participant> {
  const harOptions =
    options.har === true
      ? { recordHar: { path: testInfo.outputPath(`${slug(name)}.har`), content: "omit" as const } }
      : {};
  const context = await browser.newContext({ ...options.contextOptions, ...harOptions });
  await installTaps(context);
  const page = await context.newPage();
  const net = await recordNetwork(context, page);
  return { name, context, page, net };
}

/** Same participant in an existing context (a persistent profile the spec launched). */
export async function participantInContext(
  context: BrowserContext,
  name: string,
): Promise<Participant> {
  await installTaps(context);
  const page = await context.newPage();
  const net = await recordNetwork(context, page);
  return { name, context, page, net };
}

export async function closeAll(participants: readonly Participant[]): Promise<void> {
  for (const participant of participants) await participant.context.close();
}

function waitForPost(page: Page, path: string): Promise<Response> {
  return page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === path,
  );
}

async function setLobbyToggle(page: Page, testId: string, on: boolean): Promise<void> {
  const toggle = page.getByTestId(testId);
  const want = on ? "on" : "off";
  if ((await toggle.getAttribute(DATA_STATE)) !== want) await toggle.click();
  await expect(toggle).toHaveAttribute(DATA_STATE, want);
}

async function applyLobbyMedia(page: Page, media: MediaChoice): Promise<void> {
  await expect(page.getByTestId(SCREEN.join)).toBeVisible();
  await setLobbyToggle(page, LOBBY.micToggle, media.mic);
  await setLobbyToggle(page, LOBBY.cameraToggle, media.camera);
}

export interface LobbyHandle {
  readonly code: string;
}

/** Home "Start a meeting", stop in the lobby. The room exists; nobody has joined it yet. */
export async function openLobbyForNewMeeting(page: Page): Promise<LobbyHandle> {
  await page.goto("/");
  await expect(page.getByTestId(SCREEN.home)).toBeVisible();
  const created = waitForPost(page, API.createMeeting);
  await page.getByTestId(HOME.startMeeting).click();
  const response = await created;
  expect(response.status(), "POST /api/meetings status").toBe(STATUS.created);
  const body: unknown = await response.json();
  expect(isCreateMeetingResponse(body), "create-meeting body matches the contract").toBe(true);
  return { code: (body as { data: { code: string } }).data.code };
}

/** Home code + "Join", stop in the lobby. */
export async function openLobbyForCode(page: Page, code: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId(SCREEN.home)).toBeVisible();
  await page.getByTestId(HOME.joinCode).fill(code);
  await page.getByTestId(HOME.join).click();
  await expect(page.getByTestId(SCREEN.join)).toBeVisible();
}

/** Lobby to room: name, join, wait for the local tile. */
export async function finishJoin(
  page: Page,
  name: string,
  code: string,
  media: MediaChoice,
): Promise<void> {
  await applyLobbyMedia(page, media);
  const token = await joinFromLobby(page, name);
  expect(token.status(), `${name}: POST /api/token status`).toBe(STATUS.ok);
  await expectInRoom(page, code);
}

export async function startRoom(
  participant: Participant,
  media: MediaChoice = { mic: true, camera: true },
): Promise<string> {
  const { code } = await openLobbyForNewMeeting(participant.page);
  await finishJoin(participant.page, participant.name, code, media);
  return code;
}

export async function joinRoom(
  participant: Participant,
  code: string,
  media: MediaChoice = { mic: true, camera: true },
): Promise<void> {
  await openLobbyForCode(participant.page, code);
  await finishJoin(participant.page, participant.name, code, media);
}

/**
 * Joins with synthetic clicks only (HTMLElement.click is not a user activation),
 * so the page has no sticky user activation. WC-12 needs this: a trusted click
 * on "Join meeting" would itself unlock audio playback.
 */
export async function joinRoomWithoutUserActivation(
  participant: Participant,
  code: string,
): Promise<void> {
  const { page } = participant;
  await page.goto("/");
  await expect(page.getByTestId(SCREEN.home)).toBeVisible();
  await page.getByTestId(HOME.joinCode).fill(code);
  await page.getByTestId(HOME.join).evaluate((element) => (element as HTMLElement).click());
  await expect(page.getByTestId(SCREEN.join)).toBeVisible();
  await page.getByTestId(LOBBY.displayName).fill(participant.name);
  const token = waitForPost(page, API.token);
  await page.getByTestId(LOBBY.join).evaluate((element) => (element as HTMLElement).click());
  expect((await token).status(), "POST /api/token status").toBe(STATUS.ok);
  await expectInRoom(page, code);
}

/** The count of remote participant tiles in `page`. */
export async function expectRemoteCount(page: Page, count: number, label: string): Promise<void> {
  await expect(page.getByTestId(ROOM.remoteTile), label).toHaveCount(count, {
    timeout: CONNECT_TIMEOUT_MS,
  });
}

const OBSERVE_STEP_MS = 250;

/**
 * An absence cannot be waited for, only observed for a stated window. Calls
 * `probe` every 250 ms for `windowMs`; the probe returns null while the
 * invariant holds and a description when it breaks. This is the one place the
 * suite waits on a timer, and it observes; it never synchronises.
 */
export async function holdsFor(
  page: Page,
  windowMs: number,
  label: string,
  probe: () => Promise<string | null>,
): Promise<void> {
  const deadline = Date.now() + windowMs;
  for (;;) {
    expect(await probe(), label).toBeNull();
    if (Date.now() >= deadline) return;
    await page.waitForTimeout(OBSERVE_STEP_MS);
  }
}

/** Test-id counts as a probe result: null when `count` of them is `expected`. */
export async function countProbe(
  page: Page,
  testId: string,
  expected: number,
): Promise<string | null> {
  const count = await page.getByTestId(testId).count();
  return count === expected ? null : `${testId}: expected ${expected}, found ${count}`;
}
