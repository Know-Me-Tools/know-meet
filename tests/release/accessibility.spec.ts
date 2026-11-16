/**
 * WR-8 automated part (features/wr-8-accessible-screens.feature). Packaged
 * project only (@packaged-only), per the contract's production entry.
 * The independent UI review against DESIGN.md is a separate step (wr09 9.3);
 * this spec writes the screenshots it reviews.
 * The meeting room needs a live meeting, so each theme starts one meeting and
 * audits home, lobby and room at the four widths without reloading.
 */
import { expect, type Browser, type Page, type TestInfo, test } from "@playwright/test";
import {
  auditCell,
  type CellAudit,
  focusStopProblems,
  freezeTransitions,
  readFocusStop,
} from "./src/a11y-probes.ts";
import { attachJson, attachScreenshot } from "./src/evidence.ts";
import { expectInRoom, joinFromLobby, leave } from "./src/meeting-flow.ts";
import { DATA_STATE, HOME, LOBBY, ROOM, SCREEN, STORAGE } from "./src/test-ids.ts";

type Theme = "dark" | "light";
const THEMES: readonly Theme[] = ["dark", "light"];
const VIEWPORTS: ReadonlyArray<{ width: number; height: number }> = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
const MAX_TAB_STOPS = 40;
const A11Y_TIMEOUT_MS = 10 * 60 * 1000;
/** Longest animation or transition tolerated under prefers-reduced-motion, in ms. */
const REDUCED_MOTION_MAX_MS = 1;

async function themedPage(
  browser: Browser,
  theme: Theme,
  reducedMotion: "reduce" | "no-preference" = "no-preference",
): Promise<Page> {
  const context = await browser.newContext({ colorScheme: theme, reducedMotion });
  await context.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORAGE.theme, value: theme },
  );
  return context.newPage();
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    );
  });
}

/** Audits the current screen at every width; returns problems keyed by cell. */
async function auditAllWidths(
  page: Page,
  screen: string,
  theme: Theme,
  testInfo: TestInfo,
): Promise<Record<string, CellAudit>> {
  const cells: Record<string, CellAudit> = {};
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await settle(page);
    const cell = `${screen}/${theme}/${viewport.width}`;
    cells[cell] = await auditCell(page);
    await attachScreenshot(testInfo, page, `wr-8-${screen}-${theme}-${viewport.width}`);
  }
  return cells;
}

/**
 * Presses Tab from the current focus until every control in `testIds` has had
 * focus, in any order, checking every stop on the way (name, no ring, 3:1 fill).
 */
async function tabThrough(
  page: Page,
  testIds: readonly string[],
  problems: string[],
): Promise<void> {
  const pending = new Set(testIds);
  for (let i = 0; i < MAX_TAB_STOPS && pending.size > 0; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await readFocusStop(page);
    if (stop === null) continue;
    problems.push(...focusStopProblems(stop));
    pending.delete(stop.testId);
  }
  if (pending.size > 0) {
    throw new Error(`not reached by Tab within ${MAX_TAB_STOPS} stops: ${[...pending].join(", ")}`);
  }
}

/** Operates a control from the keyboard after Tab has shown it is reachable. */
async function press(page: Page, testId: string, key: string): Promise<void> {
  await page.getByTestId(testId).focus();
  await page.keyboard.press(key);
}

test.describe("WR-8 The three shipped screens are accessible", () => {
  for (const theme of THEMES) {
    test(
      `home, join lobby and meeting room pass axe and the fill probe in ${theme} at all widths`,
      { tag: ["@WR-8", "@value-critical", "@packaged-only"] },
      async ({ browser }, testInfo) => {
        test.setTimeout(A11Y_TIMEOUT_MS);
        const page = await themedPage(browser, theme);
        try {
          await page.goto("/");
          await expect(page.getByTestId(SCREEN.home)).toBeVisible();
          const cells = await auditAllWidths(page, "home", theme, testInfo);

          await page.getByTestId(HOME.startMeeting).click();
          await expect(page.getByTestId(SCREEN.join)).toBeVisible();
          await expect(page.getByTestId(LOBBY.cameraPreview)).toBeVisible();
          Object.assign(cells, await auditAllWidths(page, "join-lobby", theme, testInfo));

          await joinFromLobby(page, "Guest A11y");
          const roomCode = page.getByTestId(ROOM.roomCode);
          const code = (await roomCode.textContent({ timeout: 45_000 })) ?? "";
          await expectInRoom(page, code.trim());
          Object.assign(cells, await auditAllWidths(page, "meeting-room", theme, testInfo));

          await attachJson(testInfo, `wr-8-axe-${theme}.json`, cells);
          const failing = Object.entries(cells)
            .filter(([, audit]) => audit.problems.length > 0)
            .map(([cell, audit]) => ({ cell, problems: audit.problems }));
          expect(failing, "cells with axe or fill-contrast problems").toEqual([]);
        } finally {
          await page.context().close();
        }
      },
    );
  }

  test(
    "the guest flow is reachable and operable by keyboard with focus shown by fill",
    { tag: ["@WR-8", "@value-critical", "@packaged-only"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(A11Y_TIMEOUT_MS);
      const page = await themedPage(browser, "dark");
      const problems: string[] = [];
      try {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/");
        await expect(page.getByTestId(SCREEN.home)).toBeVisible();
        await freezeTransitions(page);

        await tabThrough(page, [HOME.startMeeting, HOME.joinCode, HOME.join], problems);
        await press(page, HOME.startMeeting, "Enter");

        await expect(page.getByTestId(SCREEN.join)).toBeVisible();
        await freezeTransitions(page);
        await tabThrough(page, [LOBBY.micToggle, LOBBY.cameraToggle, LOBBY.displayName], problems);
        await page.getByTestId(LOBBY.displayName).focus();
        await page.keyboard.type("Keyboard Guest");
        // Join meeting may stay disabled until a name is entered, so it is reached after typing.
        await tabThrough(page, [LOBBY.join], problems);
        await press(page, LOBBY.join, "Enter");

        await expect(page.getByTestId(ROOM.localTile)).toBeVisible({ timeout: 45_000 });
        await freezeTransitions(page);
        await tabThrough(page, [ROOM.muteMic, ROOM.muteCamera, ROOM.leave], problems);
        const mic = page.getByTestId(ROOM.muteMic);
        await press(page, ROOM.muteMic, "Space");
        await expect(mic).toHaveAttribute(DATA_STATE, "off");
        await page.keyboard.press("Space");
        await expect(mic).toHaveAttribute(DATA_STATE, "on");
        await press(page, ROOM.leave, "Enter");
        // The leave dialog (design O-7), when present, is confirmed from the keyboard too.
        const dialog = await page
          .getByTestId(ROOM.leaveConfirm)
          .waitFor({ timeout: 5_000 })
          .then(
            () => true,
            () => false,
          );
        if (dialog) {
          await tabThrough(page, [ROOM.leaveConfirm], problems);
          await press(page, ROOM.leaveConfirm, "Enter");
        }
        await expect(page.getByTestId(ROOM.localTile)).toHaveCount(0, { timeout: 45_000 });

        await attachJson(testInfo, "wr-8-keyboard.json", { problems });
        expect(
          problems,
          "focus stops without a name, with a ring or without a 3:1 fill change",
        ).toEqual([]);
      } finally {
        await page.context().close();
      }
    },
  );

  test(
    "motion stops under prefers-reduced-motion",
    { tag: ["@WR-8", "@value-critical", "@packaged-only"] },
    async ({ browser }, testInfo) => {
      test.setTimeout(A11Y_TIMEOUT_MS);
      const page = await themedPage(browser, "dark", "reduce");
      const running = async (screen: string): Promise<string[]> => {
        await settle(page);
        const long = await page.evaluate(
          (maxMs) =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === "running")
              .map((animation) => {
                const timing = animation.effect?.getComputedTiming();
                const duration = Number(timing?.duration ?? 0);
                const name =
                  "animationName" in animation
                    ? String(animation.animationName)
                    : "transitionProperty" in animation
                      ? String(animation.transitionProperty)
                      : "script";
                return { name, duration, iterations: Number(timing?.iterations ?? 1) };
              })
              .filter((a) => !(a.duration <= maxMs) || a.iterations === Number.POSITIVE_INFINITY)
              .map((a) => `${a.name} ${a.duration}ms x${a.iterations}`),
          REDUCED_MOTION_MAX_MS,
        );
        return long.map((entry) => `${screen}: ${entry}`);
      };
      try {
        const found: string[] = [];
        await page.goto("/");
        await expect(page.getByTestId(SCREEN.home)).toBeVisible();
        found.push(...(await running("home")));
        await page.getByTestId(HOME.startMeeting).click();
        await expect(page.getByTestId(SCREEN.join)).toBeVisible();
        found.push(...(await running("join-lobby")));
        await joinFromLobby(page, "Calm Guest");
        await expect(page.getByTestId(ROOM.localTile)).toBeVisible({ timeout: 45_000 });
        found.push(...(await running("meeting-room")));
        await leave(page);
        await attachJson(testInfo, "wr-8-reduced-motion.json", { found });
        expect(found, "animations still running under reduced motion").toEqual([]);
      } finally {
        await page.context().close();
      }
    },
  );

  test(
    "a control fill lowered below 3:1 fails the audit",
    { tag: ["@WR-8", "@negative-control", "@packaged-only"] },
    async ({ browser }, testInfo) => {
      const page = await themedPage(browser, "dark");
      try {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/");
        const start = page.getByTestId(HOME.startMeeting);
        await expect(start).toBeVisible();
        const before = await auditCell(page);
        // Paint the control in the colour of the surface behind it: fill contrast 1:1.
        await start.evaluate((element) => {
          let surface = "rgb(255, 255, 255)";
          for (let node = element.parentElement; node !== null; node = node.parentElement) {
            const bg = getComputedStyle(node).backgroundColor;
            if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
              surface = bg;
              break;
            }
          }
          (element as HTMLElement).style.setProperty("background-color", surface, "important");
        });
        const after = await auditCell(page);
        await attachJson(testInfo, "wr-8-negative.json", { before, after });
        expect(
          after.problems.some((p) => p.startsWith(`fill-contrast ${HOME.startMeeting}:`)),
          "the lowered fill is reported",
        ).toBe(true);
      } finally {
        await page.context().close();
      }
    },
  );
});
