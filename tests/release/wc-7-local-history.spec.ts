/**
 * WC-7 History survives a reload and never leaves the device
 * (features/wc-7-local-history.feature). Packaged then hosted; Chromium, Firefox
 * and WebKit (@cross-engine). Chat-only joins (devices off) so every engine runs.
 *
 * History is a real route of the hosted build (/history, with detail at
 * /history#meeting:<id>), reached through the shared adaptive navigation
 * (Home, History, Recordings), which is not shown on /meet: after leaving, the
 * specs go home through the meeting-ended view, then click km-nav-history.
 *
 * Device = persistent profile (wc-profile.ts): a reload reads PGlite back from
 * IndexedDB. A new profile is a different device and shows nothing.
 *
 * Privacy oracle (see wc-network.ts for its scope): the whole run's HTTP
 * requests, signalling-socket frames and page-level egress carry neither chat
 * text nor the local history id. The needles are unique per run and are not the
 * room code. The history screen is reloaded while on the list route and entries
 * are opened by client navigation only, so a route that embeds an id cannot
 * itself become a request that leaks it.
 *
 * Oracle sensitivity: the control test sends a canary POST carrying a unique
 * text to a stubbed off-origin URL and requires the detector to flag it. If the
 * detector were blind, that test fails and the privacy claim is not credited.
 */
import { expect, type Page, test } from "@playwright/test";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { leave } from "./src/meeting-flow.ts";
import { expectMessage, runTag, sendChat, uniqueText } from "./src/wc-chat.ts";
import { reachNavigation } from "./src/wc-nav.ts";
import { findLeaks, redactUrl, summarise } from "./src/wc-network.ts";
import { launchProfile } from "./src/wc-profile.ts";
import {
  closeAll,
  expectRemoteCount,
  joinRoom,
  mediaFor,
  newParticipant,
  participantInContext,
  startRoom,
} from "./src/wc-room.ts";
import { AUDIENCE_EVERYONE, HISTORY } from "./src/wc-test-ids.ts";

const TEST_TIMEOUT_MS = 6 * 60 * 1000;
const RECENT_MS = 15 * 60 * 1000;

/**
 * Opens /history through the shared adaptive navigation (bottom bar, rail or full
 * navigation). The navigation is not shown on /meet, so after leaving a room it
 * goes home first through the meeting-ended view's Home link (reachNavigation).
 */
async function openHistory(page: Page): Promise<void> {
  await reachNavigation(page);
  await page.getByTestId(HISTORY.nav).click();
  await expect(page).toHaveURL(/\/history(?:#|$)/);
  await expect(page.getByTestId(HISTORY.screen)).toBeVisible();
}

test.describe("WC-7 History survives a reload and never leaves the device", () => {
  test(
    "the meeting and both messages survive a reload; nothing carrying them is sent; delete removes it",
    { tag: ["@WC-7", "@value-critical", "@smoke", "@cross-engine"] },
    async ({ browser, browserType, browserName, baseURL, launchOptions }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const media = mediaFor(browser);
      const context = await launchProfile(browserType, testInfo.outputPath("profile-a"), {
        baseURL,
        launchOptions,
        browserName,
        harPath: testInfo.outputPath("guest-a.har"),
      });
      const a = await participantInContext(context, "Guest A");
      const b = await newParticipant(browser, "Guest B", testInfo);
      try {
        const code = await startRoom(a, media);
        await joinRoom(b, code, media);
        await expectRemoteCount(a.page, 1, "A: remote tiles");

        const tag = runTag();
        const fromA = uniqueText(tag, "from-a");
        const fromB = uniqueText(tag, "from-b");
        await sendChat(a.page, fromA, AUDIENCE_EVERYONE);
        await expectMessage(b.page, fromA, AUDIENCE_EVERYONE, "B");
        await sendChat(b.page, fromB, AUDIENCE_EVERYONE);
        await expectMessage(a.page, fromB, AUDIENCE_EVERYONE, "A");

        await leave(a.page);
        await openHistory(a.page);
        const entries = a.page.getByTestId(HISTORY.entry);
        await expect(entries, "history lists the meeting").toHaveCount(1);
        const historyId = (await entries.first().getAttribute("data-history-id")) ?? "";
        expect(historyId, "entry has a local id").not.toBe("");
        expect(historyId, "local id is not the room code").not.toBe(code);
        // ASSUMPTION: ids are uuid-like. A short id would match unrelated bytes and weaken the leak scan.
        expect(historyId.length, "local id is long enough to search for").toBeGreaterThanOrEqual(
          16,
        );

        // Reload on the list route: a fresh document reads the stored history back.
        await a.net.checkpoint();
        await a.page.reload();
        await expect(a.page.getByTestId(HISTORY.screen)).toBeVisible();
        const after = a.page.getByTestId(HISTORY.entry);
        await expect(after, "history lists the meeting after a reload").toHaveCount(1);
        await expect(after.first()).toHaveAttribute("data-history-id", historyId);
        const date = Date.parse(
          (await after.first().getByTestId(HISTORY.entryDate).getAttribute("datetime")) ?? "",
        );
        expect(Date.now() - date, "entry date is this meeting's").toBeLessThan(RECENT_MS);
        expect(date - Date.now(), "entry date is not in the future").toBeLessThan(60_000);
        // The device-only notice sits on the list, above the meetings (shape D5).
        await expect(a.page.getByTestId(HISTORY.deviceOnlyNotice)).toBeVisible();

        await after.first().getByTestId(HISTORY.entryOpen).click();
        const messages = a.page.getByTestId(HISTORY.message);
        await expect(messages.filter({ hasText: fromA }), "A's message is stored").toHaveCount(1);
        await expect(messages.filter({ hasText: fromB }), "B's message is stored (D5)").toHaveCount(
          1,
        );
        await attachScreenshot(testInfo, a.page, "wc-7-history-after-reload");

        const snapshot = await a.net.collect();
        await attachJson(testInfo, "wc-7-network-summary.json", summarise(snapshot));
        expect(snapshot.requests.length, "the recorder saw this run's traffic").toBeGreaterThan(0);
        const leaks = findLeaks(snapshot, [fromA, fromB, historyId]);
        expect(leaks, "chat text or history id left the device").toEqual([]);
        expect(snapshot.cspViolations, "CSP violations").toEqual([]);
        expect(snapshot.cspConsole, "CSP console messages").toEqual([]);

        // Delete, then reload: gone for good.
        await a.page.getByTestId(HISTORY.del).first().click();
        await a.page.getByTestId(HISTORY.deleteConfirm).click();
        // Delete lives in the detail; the list is read again through the navigation.
        await openHistory(a.page);
        await expect(a.page.getByTestId(HISTORY.entry)).toHaveCount(0);
        await a.page.reload();
        await expect(a.page.getByTestId(HISTORY.screen)).toBeVisible();
        await expect(a.page.getByTestId(HISTORY.entry), "deleted entry stays gone").toHaveCount(0);
        await attachJson(testInfo, "wc-7-run.json", {
          roomCode: code,
          historyId: "<redacted-local-id>",
        });
      } finally {
        await closeAll([a, b]);
      }
    },
  );

  test(
    "a fresh profile shows an empty history, and the leak detector flags a deliberate upload",
    { tag: ["@WC-7", "@negative-control", "@cross-engine"] },
    async ({ browserType, browserName, baseURL, launchOptions }, testInfo) => {
      test.setTimeout(TEST_TIMEOUT_MS);
      const context = await launchProfile(browserType, testInfo.outputPath("profile-fresh"), {
        baseURL,
        launchOptions,
        browserName,
      });
      const fresh = await participantInContext(context, "Guest Fresh");
      try {
        await fresh.page.goto("/");
        await openHistory(fresh.page);
        await expect(fresh.page.getByTestId(HISTORY.entry), "fresh profile history").toHaveCount(0);

        // The detector's own control: a canary upload to a stubbed host must be flagged.
        const canary = uniqueText(runTag(), "canary");
        await fresh.page.route("https://canary.invalid/**", (route) =>
          route.fulfill({ status: 200, body: "ok" }),
        );
        await fresh.page.evaluate(
          `fetch("https://canary.invalid/leak", { method: "POST", body: ${JSON.stringify(canary)} }).catch(() => undefined)`,
        );
        await expect
          .poll(async () => (await fresh.net.collect()).egress.length, {
            message: "egress tap saw the canary",
          })
          .toBeGreaterThan(0);
        const snapshot = await fresh.net.collect();
        const leaks = findLeaks(snapshot, [canary]);
        await attachJson(testInfo, "wc-7-canary.json", {
          flaggedIn: leaks.map((l) => ({ place: l.place, target: redactUrl(l.target) })),
        });
        expect(leaks.length, "the detector flags a deliberate upload").toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    },
  );
});
