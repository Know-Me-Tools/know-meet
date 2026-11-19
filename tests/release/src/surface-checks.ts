/**
 * The WR-5 surface checks as one function returning problems, so the positive
 * scenario (hosted build) and the negative control (default build) run the
 * same checks against different base URLs.
 */
import type { Browser, Page } from "@playwright/test";
import {
  byTestId,
  EXCLUDED_PATHS,
  HOSTED_PATHS,
  NAV_PATHS,
  SCREEN,
  STATE,
  STORAGE,
} from "./test-ids.ts";
import { HISTORY, RECORDING } from "./wc-test-ids.ts";

const SCREEN_OF: Readonly<Record<string, string>> = {
  "/": SCREEN.home,
  "/join": SCREEN.join,
  "/meet": SCREEN.meet,
  "/history": HISTORY.screen,
  "/recordings": RECORDING.library,
};
/** The screens of the web release proper; the negative control relies on these existing in the default build. */
export const RELEASE_PATHS: readonly string[] = ["/", "/join", "/meet"];
/** Widths of the three navigation forms: phone (bottom bar), medium (rail), desktop (full). */
const NAV_WIDTHS: readonly number[] = [375, 768, 1440];
const NAV_HEIGHT = 900;
const RENDER_TIMEOUT_MS = 15_000;
/** Shape of a signed-in user in km-auth, as the prototype and the fidelity suite write it. */
const SIGNED_IN_USER = JSON.stringify({ name: "Avery Chen", email: "avery@example.com" });

export interface SurfaceReport {
  readonly problems: string[];
  readonly linksByPath: Record<string, string[]>;
}

async function sameOriginLinkPaths(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"))
      .map((anchor) => new URL((anchor as HTMLAnchorElement).href, location.href))
      .filter((url) => url.origin === location.origin)
      .map((url) => url.pathname),
  );
}

async function showsNotFound(page: Page): Promise<boolean> {
  try {
    await page.locator(byTestId(STATE.notFound)).waitFor({ timeout: RENDER_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/** Same-origin paths of the links inside navigation landmarks that are rendered (not display:none). */
async function visibleNavPaths(page: Page): Promise<string[]> {
  const paths = await page.evaluate(() =>
    Array.from(document.querySelectorAll("nav a[href], [role=navigation] a[href]"))
      .filter((anchor) => anchor.getClientRects().length > 0)
      .map((anchor) => new URL((anchor as HTMLAnchorElement).href, location.href))
      .filter((url) => url.origin === location.origin)
      .map((url) => url.pathname),
  );
  return [...new Set(paths)].sort();
}

/** Visible text plus the accessibility tree of the page body. */
async function visibleState(page: Page): Promise<string> {
  // biome-ignore lint/performance/useDomNodeTextContent: the check is about what a visitor sees, so it needs rendered text; textContent would also return hidden text.
  const text = await page.locator("body").innerText();
  const tree = await page.locator("body").ariaSnapshot();
  return `${text}\n---\n${tree}`;
}

async function withPage<T>(
  browser: Browser,
  baseUrl: string,
  signedIn: boolean,
  run: (page: Page) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({ baseURL: baseUrl });
  if (signedIn) {
    await context.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
      key: STORAGE.auth,
      value: SIGNED_IN_USER,
    });
  }
  const page = await context.newPage();
  try {
    return await run(page);
  } finally {
    await context.close();
  }
}

export async function surfaceProblems(browser: Browser, baseUrl: string): Promise<SurfaceReport> {
  const problems: string[] = [];
  const linksByPath: Record<string, string[]> = {};

  await withPage(browser, baseUrl, false, async (page) => {
    for (const path of HOSTED_PATHS) {
      await page.goto(path);
      const screen = SCREEN_OF[path] ?? "";
      try {
        await page.locator(byTestId(screen)).waitFor({ timeout: RENDER_TIMEOUT_MS });
      } catch {
        problems.push(`${path}: screen ${screen} did not render`);
      }
      const links = await sameOriginLinkPaths(page);
      linksByPath[path] = links;
      for (const link of links) {
        if (!HOSTED_PATHS.includes(link)) problems.push(`${path}: links to ${link}`);
      }
    }
    for (const path of EXCLUDED_PATHS) {
      await page.goto(path);
      if (!(await showsNotFound(page))) {
        problems.push(`${path}: does not render the not-found state`);
      }
    }
  });

  await withPage(browser, baseUrl, false, async (page) => {
    for (const width of NAV_WIDTHS) {
      await page.setViewportSize({ width, height: NAV_HEIGHT });
      await page.goto("/");
      try {
        await page.locator(byTestId(SCREEN.home)).waitFor({ timeout: RENDER_TIMEOUT_MS });
      } catch {
        problems.push(`/ at ${width}: home did not render`);
        continue;
      }
      const nav = await visibleNavPaths(page);
      linksByPath[`nav@${width}`] = nav;
      if (nav.join(" ") !== [...NAV_PATHS].sort().join(" ")) {
        problems.push(
          `navigation at ${width}: shows ${nav.join(", ") || "nothing"}, expected ${NAV_PATHS.join(", ")}`,
        );
      }
    }
  });

  const signedOut = await withPage(browser, baseUrl, false, async (page) => {
    await page.goto("/");
    await page.locator(byTestId(SCREEN.home)).waitFor({ timeout: RENDER_TIMEOUT_MS });
    return visibleState(page);
  });
  await withPage(browser, baseUrl, true, async (page) => {
    await page.goto("/");
    await page.locator(byTestId(SCREEN.home)).waitFor({ timeout: RENDER_TIMEOUT_MS });
    if ((await visibleState(page)) !== signedOut) {
      problems.push("/: setting km-auth changes what is visible");
    }
    await page.goto("/dashboard");
    if (!(await showsNotFound(page))) {
      problems.push("/dashboard with km-auth: does not render the not-found state");
    }
  });

  return { problems, linksByPath };
}
