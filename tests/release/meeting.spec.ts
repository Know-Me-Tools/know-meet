/**
 * WR-1 Two guests hold a real meeting at the public URL
 * (features/wr-1-guest-meeting.feature). Runs in both projects: packaged first,
 * against the built images; hosted second, at https://meet.know-me.tools.
 * Real collaborators: LiveKit Cloud, the token service, the static web image
 * and Chromium with fake media devices. No fixed rooms: codes come from the
 * service per run.
 */
import { expect, test } from "@playwright/test";
import { requestToken, unissuedCode } from "./src/api-client.ts";
import { carriesToken, isApiError, STATUS } from "./src/api-contract.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectOneRemoteWithMedia, expectRemoteMuted, remoteTiles } from "./src/media-probes.ts";
import {
  CONNECT_TIMEOUT_MS,
  expectInRoom,
  joinByCode,
  leave,
  recordWebSockets,
  setMicMuted,
  startMeeting,
} from "./src/meeting-flow.ts";
import { imageDigests } from "./src/release-env.ts";
import { ROOM, STATE } from "./src/test-ids.ts";

const MEETING_TEST_TIMEOUT_MS = 5 * 60 * 1000;

test.describe("WR-1 Two guests hold a real meeting at the public URL", () => {
  test(
    "two guests see and hear each other, mute, and leave",
    { tag: ["@WR-1", "@value-critical", "@smoke"] },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(MEETING_TEST_TIMEOUT_MS);
      // Contexts inherit the project's `use` (baseURL, permissions, video, trace).
      const contextA = await browser.newContext();
      const contextB = await browser.newContext();
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      try {
        const { code } = await startMeeting(pageA, "Guest A");
        await attachJson(testInfo, "wr-1-run.json", {
          baseURL,
          roomCode: code,
          imageDigests: imageDigests(),
          project: testInfo.project.name,
        });

        const tokenB = await joinByCode(pageB, code, "Guest B");
        expect(tokenB.status(), "B: POST /api/token status").toBe(STATUS.ok);
        await expectInRoom(pageB, code);

        const seenByA = await expectOneRemoteWithMedia(pageA, "context A");
        const seenByB = await expectOneRemoteWithMedia(pageB, "context B");
        await attachJson(testInfo, "wr-1-remote-media.json", { seenByA, seenByB });
        await attachScreenshot(testInfo, pageA, "wr-1-context-a-connected");
        await attachScreenshot(testInfo, pageB, "wr-1-context-b-connected");

        // Discriminating mute check: not muted before, muted after, cleared on unmute.
        await expectRemoteMuted(pageB, false, "context B before mute");
        await setMicMuted(pageA, true);
        await expectRemoteMuted(pageB, true, "context B after A mutes");
        await attachScreenshot(testInfo, pageB, "wr-1-context-b-sees-a-muted");
        await setMicMuted(pageA, false);
        await expectRemoteMuted(pageB, false, "context B after A unmutes");

        await leave(pageA);
        await expect(remoteTiles(pageB), "context B after A leaves").toHaveCount(0, {
          timeout: CONNECT_TIMEOUT_MS,
        });
        await attachScreenshot(testInfo, pageA, "wr-1-context-a-left");
        await attachScreenshot(testInfo, pageB, "wr-1-context-b-alone");
      } finally {
        await contextA.close();
        await contextB.close();
      }
    },
  );

  test(
    "a guest who presses browser Back is no longer shown in the meeting",
    { tag: ["@WR-1", "@value-critical", "@smoke"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(MEETING_TEST_TIMEOUT_MS);
      const contextA = await browser.newContext();
      const contextB = await browser.newContext();
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      try {
        const { code } = await startMeeting(pageA, "Guest A");
        const tokenB = await joinByCode(pageB, code, "Guest B");
        expect(tokenB.status(), "B: POST /api/token status").toBe(STATUS.ok);
        await expectInRoom(pageB, code);

        // Precondition: B sees A before Back, so a zero count afterwards is a change.
        const seenByB = await expectOneRemoteWithMedia(pageB, "context B before A presses Back");
        await attachJson(testInfo, "wr-1-back-remote-media.json", { roomCode: code, seenByB });
        await attachScreenshot(testInfo, pageB, "wr-1-back-context-b-sees-a");

        await pageA.goBack();

        await expect(remoteTiles(pageB), "context B after A presses Back").toHaveCount(0, {
          timeout: CONNECT_TIMEOUT_MS,
        });
        await attachScreenshot(testInfo, pageB, "wr-1-back-context-b-alone");
      } finally {
        await contextA.close();
        await contextB.close();
      }
    },
  );

  test(
    "a well-formed code that was never issued is refused",
    { tag: ["@WR-1", "@negative-control"] },
    async ({ browser, baseURL, request }, testInfo) => {
      test.setTimeout(MEETING_TEST_TIMEOUT_MS);
      const origin = new URL(baseURL ?? "").origin;
      const code = unissuedCode();

      // The service itself refuses the code: an independent check of the same fact.
      const direct = await requestToken(request, code, "Guest B", { origin });
      expect(direct.status(), "token endpoint for an unissued code").toBe(STATUS.meetingNotFound);
      const directBody: unknown = await direct.json();
      expect(isApiError(directBody, "meeting-not-found"), "error body matches the contract").toBe(
        true,
      );
      expect(carriesToken(directBody), "no token in the refusal").toBe(false);

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      const sockets = recordWebSockets(pageB);
      try {
        const token = await joinByCode(pageB, code, "Guest B");
        expect(token.status(), "UI token request for an unissued code").toBe(
          STATUS.meetingNotFound,
        );
        await expect(pageB.getByTestId(STATE.meetingNotFound)).toBeVisible();
        await expect(pageB.getByTestId(ROOM.localTile)).toHaveCount(0);
        await expect(pageB.getByTestId(ROOM.remoteTile)).toHaveCount(0);
        await attachScreenshot(testInfo, pageB, "wr-1-negative-meeting-not-found");
        await attachJson(testInfo, "wr-1-negative.json", { code, webSockets: sockets });
        expect(sockets, "no realtime connection was opened").toEqual([]);
      } finally {
        await contextB.close();
      }
    },
  );
});
