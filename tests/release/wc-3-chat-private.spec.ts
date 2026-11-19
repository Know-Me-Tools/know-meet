/**
 * WC-3 A private message reaches only its recipient
 * (features/wc-3-chat-private.feature). Packaged then hosted; Chromium, Firefox
 * and WebKit (@cross-engine).
 *
 * The decisive witness is the wire: C's browser records every data-channel
 * message it receives (wc-taps.ts). A server or client that delivered the
 * private text to C and merely hid it in C's panel would still fail here.
 */
import { expect, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import {
  expectMessage,
  panelLacks,
  runTag,
  sendChat,
  uniqueText,
  wireCount,
  wireHas,
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
import { readTaps } from "./src/wc-taps.ts";
import { AUDIENCE_EVERYONE } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 5 * 60 * 1000;
const C_ABSENCE_WINDOW_MS = 10_000;

// ASSUMPTION (private wording): "Private to <name>". B's own view may say "you".
const PRIVATE_TO_B_FOR_A = /private to Guest B/i;
const PRIVATE_TO_B_FOR_B = /private to (Guest B|you)/i;

test.describe("WC-3 A private message reaches only its recipient", () => {
  test(
    "A to B privately: B and A show it labelled private; C never receives it",
    { tag: ["@WC-3", "@value-critical", "@smoke", "@cross-engine", "@control-embedded"] },
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

        const tag = runTag();
        const secret = uniqueText(tag, "private");
        const control = uniqueText(tag, "everyone-control");

        await sendChat(a.page, secret, { privateTo: "Guest B" });
        await expectMessage(b.page, secret, PRIVATE_TO_B_FOR_B, "B");
        await expectMessage(a.page, secret, PRIVATE_TO_B_FOR_A, "A (own view)");

        // The control goes out after the private message, in the same run, to C as well.
        await sendChat(a.page, control, AUDIENCE_EVERYONE);
        await expectMessage(c.page, control, AUDIENCE_EVERYONE, "C (control)");
        expect(await wireHas(c.page, control), "C's data channel carried the control").toBe(true);
        expect(await wireCount(c.page), "C's wire log is not empty").toBeGreaterThan(0);

        await holdsFor(
          c.page,
          C_ABSENCE_WINDOW_MS,
          "C never receives the private text",
          async () => {
            return (await panelLacks(c.page, secret)) ?? (await wireLacks(c.page, secret));
          },
        );

        const wire = (await readTaps(c.page)).wire;
        await attachJson(
          testInfo,
          "wc-3-c-received-stream-log.json",
          wire.map((m) => ({
            label: m.label,
            bytes: m.text.length,
            hasPrivate: m.text.includes(secret),
            hasControl: m.text.includes(control),
          })),
        );
        await attachJson(testInfo, "wc-3-run.json", { roomCode: code, secret, control });
        for (const p of [a, b, c]) await attachScreenshot(testInfo, p.page, `wc-3-${p.name}`);
      } finally {
        await closeAll([a, b, c]);
      }
    },
  );
});
