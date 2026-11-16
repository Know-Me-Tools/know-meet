/**
 * The guest flow, driven through the UI contract in test-ids.ts:
 * home -> join lobby -> meeting room. Every step waits on a visible state or a
 * response, never on a timer.
 */
import { expect, type Page, type Response } from "@playwright/test";
import { API, isCreateMeetingResponse, ROOM_CODE_PATTERN, STATUS } from "./api-contract.ts";
import { DATA_STATE, HOME, LOBBY, ROOM, SCREEN } from "./test-ids.ts";

/** Generous because the first join includes LiveKit region discovery and ICE. */
export const CONNECT_TIMEOUT_MS = 45_000;

function isPost(response: Response, path: string): boolean {
  return response.request().method() === "POST" && new URL(response.url()).pathname === path;
}

export interface StartedMeeting {
  /** The code the service returned from POST /api/meetings. */
  readonly code: string;
}

/** Home: "Start a meeting"; then the lobby (name); then the room. */
export async function startMeeting(page: Page, name: string): Promise<StartedMeeting> {
  await page.goto("/");
  await expect(page.getByTestId(SCREEN.home)).toBeVisible();
  const created = page.waitForResponse((r) => isPost(r, API.createMeeting));
  await page.getByTestId(HOME.startMeeting).click();
  const response = await created;
  expect(response.status(), "POST /api/meetings status").toBe(STATUS.created);
  const body: unknown = await response.json();
  expect(isCreateMeetingResponse(body), "create-meeting body matches the contract").toBe(true);
  const code = (body as { data: { code: string } }).data.code;
  const token = await joinFromLobby(page, name);
  expect(token.status(), "POST /api/token status").toBe(STATUS.ok);
  await expectInRoom(page, code);
  return { code };
}

/** Home: code + "Join"; then the lobby (name). Returns the token response. */
export async function joinByCode(page: Page, code: string, name: string): Promise<Response> {
  await page.goto("/");
  await expect(page.getByTestId(SCREEN.home)).toBeVisible();
  await page.getByTestId(HOME.joinCode).fill(code);
  await page.getByTestId(HOME.join).click();
  return joinFromLobby(page, name);
}

/** Lobby: enter the name and press "Join meeting". Returns the token response. */
export async function joinFromLobby(page: Page, name: string): Promise<Response> {
  await expect(page.getByTestId(SCREEN.join)).toBeVisible();
  await page.getByTestId(LOBBY.displayName).fill(name);
  const token = page.waitForResponse((r) => isPost(r, API.token));
  await page.getByTestId(LOBBY.join).click();
  return token;
}

/** The room is rendered for this code with the local tile connected. */
export async function expectInRoom(page: Page, code: string): Promise<void> {
  expect(code).toMatch(ROOM_CODE_PATTERN);
  await expect(page.getByTestId(SCREEN.meet)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });
  await expect(page.getByTestId(ROOM.roomCode)).toHaveText(code);
  await expect(page.getByTestId(ROOM.localTile)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });
}

export async function setMicMuted(page: Page, muted: boolean): Promise<void> {
  const button = page.getByTestId(ROOM.muteMic);
  const want = muted ? "off" : "on";
  if ((await button.getAttribute(DATA_STATE)) !== want) await button.click();
  await expect(button).toHaveAttribute(DATA_STATE, want);
}

/** Short wait for the optional leave dialog; it opens on the same click if it exists. */
const DIALOG_WAIT_MS = 5_000;

/** Presses Leave, confirms in the leave dialog when one opens, and waits until the room is gone. */
export async function leave(page: Page): Promise<void> {
  await page.getByTestId(ROOM.leave).click();
  const confirm = page.getByTestId(ROOM.leaveConfirm);
  const dialog = await confirm.waitFor({ timeout: DIALOG_WAIT_MS }).then(
    () => true,
    () => false,
  );
  if (dialog) await confirm.click();
  await expect(page.getByTestId(ROOM.localTile)).toHaveCount(0, { timeout: CONNECT_TIMEOUT_MS });
}

/** Records every WebSocket the page opens (WR-1 negative control: must stay empty). */
export function recordWebSockets(page: Page): string[] {
  const urls: string[] = [];
  page.on("websocket", (socket) => {
    // Only scheme, host and path: the query of a LiveKit signal URL holds the access token.
    const url = new URL(socket.url());
    urls.push(`${url.protocol}//${url.host}${url.pathname}`);
  });
  return urls;
}
