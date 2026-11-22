/**
 * In-page state log for the hardening scenarios (web-conferencing-hardening, wh01).
 *
 * The Background section's states can be short (a warm open), or happen while the main thread
 * is blocked by the effect engine's first frame. Polling from Playwright samples a frozen page;
 * a MutationObserver inside the page records every change with its timestamp instead, and the
 * test reads the log afterwards (HD-1, HD-5).
 */
import type { BrowserContext, Page } from "@playwright/test";

export interface EffectLogEntry {
  /** performance.now() in the page when the change was observed. */
  readonly t: number;
  /** km-effect-status data-state, or null when the status line is absent. */
  readonly state: string | null;
  /** The radiogroup's aria-busy, or null when the group is absent. */
  readonly busy: string | null;
}

interface EffectLogWindow {
  __kmEffectLog?: EffectLogEntry[];
}

/**
 * Starts logging the Background status and the group's aria-busy. Idempotent. Safe to call
 * before the section exists: the observer watches the whole document.
 */
export async function startEffectLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as EffectLogWindow;
    if (w.__kmEffectLog !== undefined) return;
    const log: EffectLogEntry[] = [];
    w.__kmEffectLog = log;
    let last = "";
    const record = (): void => {
      const status = document.querySelector('[data-testid="km-effect-status"]');
      const group = document.querySelector(
        '[role="radiogroup"][aria-labelledby="settings-background-heading"]',
      );
      const entry = {
        t: performance.now(),
        state: status?.getAttribute("data-state") ?? null,
        busy: group?.getAttribute("aria-busy") ?? null,
      };
      const key = `${entry.state}|${entry.busy}`;
      if (key === last) return;
      last = key;
      log.push(entry);
    };
    record();
    new MutationObserver(record).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-busy"],
    });
  });
}

export async function readEffectLog(page: Page): Promise<EffectLogEntry[]> {
  return page.evaluate(() => [...((window as unknown as EffectLogWindow).__kmEffectLog ?? [])]);
}

export async function clearEffectLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log = (window as unknown as EffectLogWindow).__kmEffectLog;
    if (log !== undefined) log.length = 0;
  });
}

interface SeenLogWindow {
  __kmSeen?: Record<string, number>;
}

/**
 * Records the first time an element matching `selector` is visible (non-zero box), keyed by
 * `key`. Used by HD-5 to prove the audit ran while the saving line was on screen.
 */
export async function watchFirstVisible(page: Page, key: string, selector: string): Promise<void> {
  await page.evaluate(
    ({ key: k, selector: s }) => {
      const w = window as unknown as SeenLogWindow;
      w.__kmSeen ??= {};
      const seen = w.__kmSeen;
      const check = (): void => {
        if (seen[k] !== undefined) return;
        const el = document.querySelector(s);
        if (el !== null && el.getBoundingClientRect().height > 0) seen[k] = performance.now();
      };
      check();
      new MutationObserver(check).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
      });
    },
    { key, selector },
  );
}

export async function firstVisibleAt(page: Page, key: string): Promise<number | null> {
  return page.evaluate((k) => (window as unknown as SeenLogWindow).__kmSeen?.[k] ?? null, key);
}

interface AttachCountWindow {
  __kmAttaches?: number;
  MediaStreamTrackGenerator?: new (...args: never[]) => object;
}

/**
 * Counts MediaStreamTrackGenerator constructions: in Chromium every background processor attach
 * makes one, so a preparation that attaches the engine again is visible (HD-1 (e)). Install
 * before page load.
 */
export async function installAttachCounter(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const w = window as unknown as AttachCountWindow;
    w.__kmAttaches = 0;
    const original = w.MediaStreamTrackGenerator;
    if (original === undefined) return;
    w.MediaStreamTrackGenerator = new Proxy(original, {
      construct(target, args, newTarget) {
        w.__kmAttaches = (w.__kmAttaches ?? 0) + 1;
        return Reflect.construct(target, args, newTarget) as object;
      },
    });
  });
}

export async function attachCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as AttachCountWindow).__kmAttaches ?? 0);
}
