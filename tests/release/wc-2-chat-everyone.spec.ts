/**
 * WC-2 A message to everyone reaches every participant
 * (features/wc-2-chat-everyone.feature). Packaged then hosted; Chromium, Firefox
 * and WebKit (@cross-engine). Firefox and WebKit join with devices off.
 */
import { expect, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import {
  expectMessage,
  panelLacks,
  runTag,
  sendChat,
  uniqueText,
  wireLacks,
} from "./src/wc-chat.ts";
import {
  closeAll,
  expectRemoteCount,
  holdsFor,
  joinRoom,
  mediaFor,
  newParticipant,
  startRoom,
} from "./src/wc-room.ts";
import { AUDIENCE_EVERYONE } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 5 * 60 * 1000;
const NEGATIVE_WINDOW_MS = 10_000;

test.describe("WC-2 A message to everyone reaches every participant", () => {
  test(
    "A's message appears for B and C with the sent text and the label Everyone",
    { tag: ["@WC-2", "@value-critical", "@smoke", "@cross-engine"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const media = mediaFor(browser);
      const [a, b, c] = await Promise.all([
        newParticipant(browser, "Guest A", testInfo),
        newParticipant(browser, "Guest B", testInfo),
        newParticipant(browser, "Guest C", testInfo),
      ]);
      try {
        const code = await startRoom(a, media);
        await joinRoom(b, code, media);
        await joinRoom(c, code, media);
        for (const p of [a, b, c]) await expectRemoteCount(p.page, 2, `${p.name}: remote tiles`);

        const text = uniqueText(runTag(), "everyone");
        await sendChat(a.page, text, AUDIENCE_EVERYONE);
        await expectMessage(b.page, text, AUDIENCE_EVERYONE, "B");
        await expectMessage(c.page, text, AUDIENCE_EVERYONE, "C");
        await expectMessage(a.page, text, AUDIENCE_EVERYONE, "A (own view)");
        await attachJson(testInfo, "wc-2-run.json", { roomCode: code, text });
        for (const p of [a, b, c]) await attachScreenshot(testInfo, p.page, `wc-2-${p.name}`);
      } finally {
        await closeAll([a, b, c]);
      }
    },
  );

  test(
    "a message that was never sent does not appear in any panel or data channel",
    { tag: ["@WC-2", "@negative-control", "@cross-engine"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const media = mediaFor(browser);
      const [a, b, c] = await Promise.all([
        newParticipant(browser, "Guest A", testInfo),
        newParticipant(browser, "Guest B", testInfo),
        newParticipant(browser, "Guest C", testInfo),
      ]);
      try {
        const code = await startRoom(a, media);
        await joinRoom(b, code, media);
        await joinRoom(c, code, media);
        const tag = runTag();
        const sent = uniqueText(tag, "sent");
        const neverSent = uniqueText(tag, "never-sent");

        // A message that IS sent proves the listeners are live in this very run.
        await sendChat(a.page, sent, AUDIENCE_EVERYONE);
        await expectMessage(b.page, sent, AUDIENCE_EVERYONE, "B");
        await expectMessage(c.page, sent, AUDIENCE_EVERYONE, "C");

        for (const p of [a, b, c]) {
          await holdsFor(
            p.page,
            NEGATIVE_WINDOW_MS,
            `${p.name}: never-sent text absent`,
            async () => {
              const problem = await panelLacks(p.page, neverSent);
              return problem ?? (await wireLacks(p.page, neverSent));
            },
          );
        }
        expect(neverSent).not.toBe(sent);
      } finally {
        await closeAll([a, b, c]);
      }
    },
  );
});
