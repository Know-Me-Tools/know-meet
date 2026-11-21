/**
 * WC-13 New controls are accessible and match the approved designs, automated
 * half (features/wc-13-*). Packaged project only (@packaged-only), Chromium with
 * fake media. Extends WR-8 (accessibility.spec.ts) over the new surfaces: share
 * control and tile, chat with audience picker, Enable audio, lobby device
 * pickers and meter, room device settings with speaker, background effects,
 * recording consent and indicator, /history list, detail and delete confirm,
 * /recordings library and playback, and the adaptive navigation on those routes.
 * The UI review against docs/design/shapes/web-conferencing/ is a separate step;
 * this spec writes the screenshots it reviews (each surface, 4 widths, 2 themes).
 *
 * Each theme starts one live two-person meeting and audits every surface it can
 * reach without reloading (src/wc-a11y-tour.ts). Boundary-only (VLBV).
 */
import { expect, test } from "@playwright/test";
import { freezeTransitions } from "./src/a11y-probes.ts";
import { attachJson } from "./src/evidence.ts";
import { HOME, LOBBY, ROOM, SCREEN } from "./src/test-ids.ts";
import {
  auditAllWidths,
  auditSurface,
  DESKTOP,
  longAnimations,
  pressOn,
  type SurfaceAudit,
  type Target,
  THEMES,
  tabThrough,
  themedParticipant,
} from "./src/wc-a11y-surfaces.ts";
import { prepareListener, tourSurfaces } from "./src/wc-a11y-tour.ts";
import {
  closeAll,
  expectRemoteCount,
  joinRoomWithoutUserActivation,
  type Participant,
} from "./src/wc-room.ts";
import {
  AUDIO_PROMPT,
  CHAT,
  DEVICES,
  EFFECTS,
  HISTORY,
  NAV,
  RECORDING,
  SHARE,
} from "./src/wc-test-ids.ts";

const WC13_TIMEOUT_MS = 20 * 60 * 1000;
const TAGS = ["@WC-13", "@value-critical", "@packaged-only"];
const ENABLE_AUDIO: Target = { role: "button", name: AUDIO_PROMPT.buttonName };
const HOME_LINK: Target = { role: "link", name: "Home" };

test.describe("WC-13 New controls are accessible and match the approved designs", () => {
  for (const theme of THEMES) {
    test(
      `every new surface passes axe, the stroke scan and the fill probe in ${theme} at all widths`,
      { tag: TAGS },
      async ({ browser, baseURL }, testInfo) => {
        test.setTimeout(WC13_TIMEOUT_MS);
        const a = await themedParticipant(browser, "Guest A", theme, testInfo, baseURL);
        const b = await themedParticipant(browser, "Guest B", theme, testInfo, baseURL);
        await prepareListener(b);
        const cells: Record<string, SurfaceAudit> = {};
        const unreached: string[] = [];
        try {
          await a.page.setViewportSize(DESKTOP);
          await b.page.setViewportSize(DESKTOP);
          await tourSurfaces(
            a,
            b,
            async (surface, page, prepare) => {
              Object.assign(cells, await auditAllWidths(page, surface, theme, testInfo, prepare));
            },
            unreached,
          );
        } finally {
          await attachJson(testInfo, `wc-13-axe-${theme}.json`, {
            cells,
            unreached,
          });
          await closeAll([a, b]);
        }
        const failing = Object.entries(cells)
          .filter(([, audit]) => audit.problems.length > 0)
          .map(([cell, audit]) => ({ cell, problems: audit.problems }));
        expect(unreached, "surfaces the tour could not reach").toEqual([]);
        expect(failing, "cells with axe, stroke or fill-contrast problems").toEqual([]);
      },
    );
  }

  test(
    "every new control is reachable and operable by keyboard with focus shown by fill",
    { tag: TAGS },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(WC13_TIMEOUT_MS);
      const a = await themedParticipant(browser, "Guest A", "dark", testInfo, baseURL);
      const b = await themedParticipant(browser, "Guest B", "dark", testInfo, baseURL);
      await prepareListener(b);
      const problems: string[] = [];
      try {
        await keyboardTour(a, b, problems);
      } finally {
        await attachJson(testInfo, "wc-13-keyboard.json", {
          problems: [...new Set(problems)],
        });
        await closeAll([a, b]);
      }
      expect(
        [...new Set(problems)],
        "unreached controls, focus stops without a name, with a ring or without a 3:1 fill change",
      ).toEqual([]);
    },
  );

  test(
    "motion stops under prefers-reduced-motion on every new surface",
    { tag: TAGS },
    async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(WC13_TIMEOUT_MS);
      const a = await themedParticipant(browser, "Calm A", "dark", testInfo, baseURL, "reduce");
      const b = await themedParticipant(browser, "Calm B", "dark", testInfo, baseURL, "reduce");
      await prepareListener(b);
      const found: string[] = [];
      const unreached: string[] = [];
      try {
        await a.page.setViewportSize(DESKTOP);
        await b.page.setViewportSize(DESKTOP);
        await tourSurfaces(
          a,
          b,
          async (surface, page) => {
            found.push(...(await longAnimations(page, surface)));
          },
          unreached,
        );
      } finally {
        await attachJson(testInfo, "wc-13-reduced-motion.json", {
          found,
          unreached,
        });
        await closeAll([a, b]);
      }
      expect(unreached, "surfaces the tour could not reach").toEqual([]);
      expect(found, "animations still running under reduced motion").toEqual([]);
    },
  );

  test(
    "the audit fails on a fixture page with a known violation",
    { tag: ["@WC-13", "@negative-control", "@packaged-only"] },
    async ({ page }, testInfo) => {
      await page.setViewportSize(DESKTOP);
      // Known violations: an unnamed button (axe button-name), an image without
      // alt text (axe image-alt) and a bordered card (stroke scan).
      await page.setContent(
        `<!doctype html><html lang="en"><head><title>WC-13 fixture</title></head><body>
          <main><h1>Fixture</h1>
            <button data-testid="fixture-unnamed" style="background:#888;color:#000;width:44px;height:44px"></button>
            <img data-testid="fixture-no-alt" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="10" height="10">
            <div data-testid="fixture-bordered" style="border:1px solid #333;padding:8px">Card</div>
          </main></body></html>`,
      );
      const audit = await auditSurface(page);
      await attachJson(testInfo, "wc-13-negative.json", audit);
      const ids = audit.axe.map((v) => v.id);
      expect(ids, "axe reports the unnamed button").toContain("button-name");
      expect(ids, "axe reports the image without alt").toContain("image-alt");
      expect(
        audit.strokes.some((s) => s.kind === "border" && s.element === "fixture-bordered"),
        "the stroke scan reports the bordered card",
      ).toBe(true);
      expect(audit.problems.length, "the audit as a whole fails").toBeGreaterThan(0);
    },
  );
});

/** The keyboard half: every new control reached with Tab and operated with Enter, Space or arrows. */
async function keyboardTour(a: Participant, b: Participant, problems: string[]): Promise<void> {
  const pa = a.page;
  await pa.setViewportSize(DESKTOP);
  await b.page.setViewportSize(DESKTOP);
  await pa.goto("/");
  await expect(pa.getByTestId(SCREEN.home)).toBeVisible();
  await freezeTransitions(pa);
  await tabThrough(pa, [NAV.home, HISTORY.nav, RECORDING.nav, HOME.startMeeting], problems, "home");
  await pressOn(pa, HOME.startMeeting, "Enter");

  await expect(pa.getByTestId(SCREEN.join)).toBeVisible();
  await freezeTransitions(pa);
  await tabThrough(
    pa,
    [DEVICES.lobbyMicSelect, DEVICES.lobbyCameraSelect, LOBBY.displayName],
    problems,
    "lobby",
  );
  await pa.getByTestId(LOBBY.displayName).focus();
  await pa.keyboard.type(a.name);
  await tabThrough(pa, [LOBBY.join], problems, "lobby");
  await pressOn(pa, LOBBY.join, "Enter");
  await expect(pa.getByTestId(ROOM.localTile)).toBeVisible({ timeout: 45_000 });
  const code = ((await pa.getByTestId(ROOM.roomCode).textContent()) ?? "").trim();

  await joinRoomWithoutUserActivation(b, code);
  await expectRemoteCount(b.page, 1, "B: remote tiles");
  await expect(b.page.getByRole("button", { name: AUDIO_PROMPT.buttonName })).toBeVisible({
    timeout: 30_000,
  });
  await freezeTransitions(b.page);
  await tabThrough(b.page, [ENABLE_AUDIO], problems, "enable-audio");
  await pressOn(b.page, ENABLE_AUDIO, "Enter");
  await expect(b.page.getByTestId(SCREEN.meet)).toHaveAttribute(
    AUDIO_PROMPT.stateAttribute,
    "true",
  );

  await freezeTransitions(pa);
  await tabThrough(
    pa,
    [SHARE.control, CHAT.toggle, DEVICES.roomSettings, RECORDING.control],
    problems,
    "room",
  );
  const share = pa.getByTestId(SHARE.control);
  await pressOn(pa, SHARE.control, "Enter");
  await expect(share, "share starts from the keyboard").toHaveAttribute("data-state", "on");
  await pressOn(pa, SHARE.control, "Enter");
  await expect(share, "share stops from the keyboard").toHaveAttribute("data-state", "off");

  const panel = pa.getByTestId(CHAT.panel);
  if (!(await panel.isVisible())) await pressOn(pa, CHAT.toggle, "Enter");
  await expect(panel, "chat opens from the keyboard").toBeVisible();
  await tabThrough(pa, [CHAT.audience, CHAT.input], problems, "chat");
  await pa.getByTestId(CHAT.input).focus();
  await pa.keyboard.type("keyboard hello");
  await tabThrough(pa, [CHAT.send], problems, "chat");
  await pressOn(pa, CHAT.send, "Enter");
  await expect(pa.getByTestId(CHAT.messageText).filter({ hasText: "keyboard hello" })).toHaveCount(
    1,
  );

  const settings = pa.getByTestId(DEVICES.roomSettings);
  await pressOn(pa, DEVICES.roomSettings, "Enter");
  await expect(settings, "settings opens from the keyboard").toHaveAttribute(
    "aria-expanded",
    "true",
  );
  // On software graphics the effect choices are replaced by a "not available" note
  // (repair 9), so the effect radios are only toured when they are offered.
  const effectsOffered = !(await pa.getByTestId(EFFECTS.unavailable).isVisible());
  await tabThrough(
    pa,
    effectsOffered
      ? [DEVICES.roomMicSelect, DEVICES.roomCameraSelect, DEVICES.roomSpeakerSelect, EFFECTS.off]
      : [DEVICES.roomMicSelect, DEVICES.roomCameraSelect, DEVICES.roomSpeakerSelect],
    problems,
    "settings",
  );
  if (effectsOffered) {
    await pressOn(pa, EFFECTS.off, "ArrowRight");
    await expect(pa.getByTestId(EFFECTS.blur), "arrow moves the effect choice").toBeChecked();
    await pa.keyboard.press("ArrowLeft");
    await expect(pa.getByTestId(EFFECTS.off), "arrow moves it back").toBeChecked();
  }
  await pa.keyboard.press("Escape");
  if ((await settings.getAttribute("aria-expanded")) === "true") {
    problems.push("settings: Escape does not close the sheet");
    await pressOn(pa, DEVICES.roomSettings, "Enter");
  } else if (
    (await pa.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? "")) !==
    DEVICES.roomSettings
  ) {
    problems.push("settings: focus does not return to the Settings control on close");
  }

  await pressOn(pa, RECORDING.control, "Enter");
  await expect(b.page.getByTestId(RECORDING.prompt), "B is asked for consent").toBeVisible();
  await freezeTransitions(b.page);
  await tabThrough(b.page, [RECORDING.agree, RECORDING.decline], problems, "consent");
  await pressOn(b.page, RECORDING.agree, "Enter");
  await expect(pa.getByTestId(RECORDING.indicator)).toBeVisible();
  await pa.waitForTimeout(3_000); // observe: a few seconds of recording so playback has content
  await pressOn(pa, RECORDING.control, "Enter");
  await expect(pa.getByTestId(RECORDING.control)).toHaveAttribute("data-state", "off");

  await tabThrough(pa, [ROOM.leave], problems, "room");
  await pressOn(pa, ROOM.leave, "Enter");
  const confirm = pa.getByTestId(ROOM.leaveConfirm);
  if (
    await confirm.waitFor({ timeout: 5_000 }).then(
      () => true,
      () => false,
    )
  ) {
    await pressOn(pa, ROOM.leaveConfirm, "Enter");
  }
  await expect(pa.getByTestId(ROOM.localTile)).toHaveCount(0, {
    timeout: 45_000,
  });
  await freezeTransitions(pa);
  await tabThrough(pa, [HOME_LINK], problems, "meeting-ended");
  await pressOn(pa, HOME_LINK, "Enter");
  await expect(pa.getByTestId(NAV.home)).toBeVisible();

  await tabThrough(pa, [HISTORY.nav], problems, "home");
  await pressOn(pa, HISTORY.nav, "Enter");
  await expect(pa.getByTestId(HISTORY.screen)).toBeVisible();
  await tabThrough(pa, [HISTORY.entryOpen], problems, "history-list");
  await pa.getByTestId(HISTORY.entryOpen).first().focus();
  await pa.keyboard.press("Enter");
  await expect(pa.getByTestId(HISTORY.del)).toBeVisible();
  await tabThrough(pa, [HISTORY.del], problems, "history-detail");
  await pressOn(pa, HISTORY.del, "Enter");
  await expect(pa.getByTestId(HISTORY.deleteConfirm)).toBeVisible();
  await tabThrough(pa, [HISTORY.deleteConfirm], problems, "history-delete");
  await pressOn(pa, HISTORY.deleteConfirm, "Enter");
  await expect(pa.getByTestId(HISTORY.deleteConfirm)).toHaveCount(0);

  await tabThrough(pa, [RECORDING.nav], problems, "history");
  await pressOn(pa, RECORDING.nav, "Enter");
  await expect(pa.getByTestId(RECORDING.library)).toBeVisible();
  await tabThrough(pa, [RECORDING.item], problems, "recordings-library");
  await pa.getByTestId(RECORDING.item).first().focus();
  await pa.keyboard.press("Enter");
  await expect(pa.getByTestId(RECORDING.play)).toBeVisible();
  await tabThrough(pa, [RECORDING.play], problems, "recordings-detail");
  await pressOn(pa, RECORDING.play, "Enter");
  await expect
    .poll(() => pa.getByTestId(RECORDING.player).evaluate((el) => !(el as HTMLVideoElement).paused))
    .toBe(true);
}
