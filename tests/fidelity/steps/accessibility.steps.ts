import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { contextOptions, prepareContext } from "../src/support/capture-environment.ts";
import type { Theme } from "../src/support/inventory.ts";
import { renderCell } from "../src/support/render-cell.ts";
import { Given, inScopeIdsOf, Then, When } from "./fixtures.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const THEMES: readonly Theme[] = ["dark", "light"];
const VIEWPORTS: readonly number[] = [375, 768, 1024, 1440];
const MAX_TAB_STOPS = 15;

interface CellViolations {
  readonly cell: string;
  readonly violations: ReadonlyArray<{ id: string; impact: string; nodes: number }>;
}

const results = new WeakMap<object, CellViolations[]>();
const injected = new WeakMap<object, string[]>();
const injectedPages = new WeakMap<object, Page>();

async function analyse(page: Page): Promise<CellViolations["violations"]> {
  const report = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return report.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? "unknown",
    nodes: v.nodes.length,
  }));
}

When(
  "axe analyses every in-scope inventory state of page {string} in each theme at each viewport",
  async ({ browser, inventory, appTarget, scenario }, pageName: string) => {
    const collected: CellViolations[] = [];
    for (const entry of inScopeIdsOf(inventory, pageName)) {
      for (const theme of THEMES) {
        for (const viewport of VIEWPORTS) {
          const cell = await renderCell(browser, appTarget, entry, theme, viewport);
          if (cell === null) continue;
          try {
            collected.push({
              cell: `${entry.id}/${theme}/${viewport}`,
              violations: await analyse(cell.page),
            });
          } finally {
            await cell.context.close();
          }
        }
      }
    }
    expect(collected.length, `states analysed for page ${pageName}`).toBeGreaterThan(0);
    results.set(scenario, collected);
  },
);

Then("no WCAG 2.2 A or AA violation is reported", async ({ scenario }) => {
  const failing = (results.get(scenario) ?? []).filter((r) => r.violations.length > 0);
  expect(failing).toEqual([]);
});

Then("the axe results are recorded as evidence", async ({ scenario, $testInfo }) => {
  await $testInfo.attach("axe-results.json", {
    body: JSON.stringify(results.get(scenario) ?? [], null, 2),
    contentType: "application/json",
  });
});

When(
  "the home route is tabbed through from the top in each theme",
  async ({ browser, baseURL, appStateMap, scenario, $testInfo }) => {
    const stops: string[] = [];
    for (const theme of THEMES) {
      const context = await browser.newContext(contextOptions(1440));
      const origin = baseURL ?? "";
      await prepareContext(context, {
        theme,
        access: "guest",
        allowedOrigin: new URL(origin).origin,
        blocked: [],
      });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/`);
        await page.waitForLoadState("networkidle");
        for (let index = 0; index < MAX_TAB_STOPS; index += 1) {
          await page.keyboard.press("Tab");
          const stop = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (el === null || el === document.body) return null;
            const labelledBy = el.getAttribute("aria-labelledby");
            const labelled =
              labelledBy === null ? "" : (document.getElementById(labelledBy)?.textContent ?? "");
            const name =
              (el.getAttribute("aria-label") ?? labelled ?? "").trim() ||
              (el.textContent ?? "").trim() ||
              (el.getAttribute("title") ?? "");
            const style = getComputedStyle(el);
            const ring =
              (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
              style.boxShadow !== "none";
            return {
              tag: el.tagName.toLowerCase(),
              href: el.getAttribute("href") ?? "",
              name,
              ring,
            };
          });
          if (stop === null) break;
          stops.push(JSON.stringify({ theme, ...stop }));
        }
      } finally {
        await context.close();
      }
    }
    scenario.focusStops = stops;
    expect(appStateMap.roles.main).not.toBe("");
    await $testInfo.attach("focus-stops.json", {
      body: `[${stops.join(",")}]`,
      contentType: "application/json",
    });
  },
);

Then("the skip link is the first focus stop", async ({ scenario }) => {
  const firstPerTheme = THEMES.map((theme) =>
    (scenario.focusStops ?? [])
      .map((s) => JSON.parse(s) as { theme: string; href: string; name: string })
      .find((s) => s.theme === theme),
  );
  for (const first of firstPerTheme) {
    expect(first?.href, "first Tab stop must be the skip link to #main").toBe("#main");
  }
});

Then(
  "every focused control has an accessible name and a visible focus indicator",
  async ({ scenario }) => {
    const stops = (scenario.focusStops ?? []).map(
      (s) => JSON.parse(s) as { name: string; ring: boolean; tag: string },
    );
    expect(stops.length).toBeGreaterThan(1);
    expect(stops.filter((s) => s.name.length === 0 || !s.ring)).toEqual([]);
  },
);

Given(
  "the home route is rendered in the light theme at {int}",
  async ({ browser, baseURL, scenario }, viewport: number) => {
    const context = await browser.newContext(contextOptions(viewport));
    scenario.cleanups.push(() => context.close());
    const origin = baseURL ?? "";
    await prepareContext(context, {
      theme: "light",
      access: "guest",
      allowedOrigin: new URL(origin).origin,
      blocked: [],
    });
    const page = await context.newPage();
    await page.goto(`${origin}/`);
    await page.waitForLoadState("networkidle");
    injectedPages.set(scenario, page);
  },
);

When(
  "a button without an accessible name and text with contrast below 4.5:1 are injected",
  async ({ scenario }) => {
    const page = injectedPages.get(scenario);
    if (page === undefined) throw new Error("home route not rendered");
    await page.evaluate(() => {
      const host = document.querySelector("main") ?? document.body;
      const button = document.createElement("button");
      button.type = "button";
      button.id = "km-negative-control-button";
      const text = document.createElement("p");
      text.textContent = "Negative control: low contrast text";
      text.style.cssText = "color:#bbbbbb;background:#ffffff;font-size:14px";
      host.prepend(button, text);
    });
    injected.set(
      scenario,
      (await analyse(page)).map((v) => v.id),
    );
  },
);

Then(
  "axe reports a {string} violation and a {string} violation",
  async ({ scenario }, first: string, second: string) => {
    expect(injected.get(scenario) ?? []).toEqual(expect.arrayContaining([first, second]));
  },
);
