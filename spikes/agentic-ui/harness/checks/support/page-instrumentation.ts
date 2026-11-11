/**
 * Init script installed before any prototype code runs. Records:
 *   __kmXssCalls   ids passed to the __kmXss sentinel (hostile payloads call it)
 *   __kmLongTasks  long tasks (Chromium only; empty elsewhere)
 *   __kmLive       distinct texts of [data-testid="km-live-region"], timestamped
 *   __kmFocus      focusin targets, timestamped
 *   __kmMarks      named performance.now() marks set by the checks
 * The function is serialised by Playwright, so it must not close over anything.
 */

export interface KmLiveRecord {
  readonly t: number;
  readonly text: string;
}

export interface KmFocusRecord {
  readonly t: number;
  readonly testid: string | null;
  readonly tag: string;
}

export interface KmInstrumentation {
  xssCalls: string[];
  longTasks: { start: number; duration: number }[];
  live: KmLiveRecord[];
  focus: KmFocusRecord[];
  marks: Record<string, number>;
  longTaskSupported: boolean;
}

declare global {
  interface Window {
    __kmXss?: (id: string) => void;
    __km?: KmInstrumentation;
  }
}

export function installInstrumentation(): void {
  const km: KmInstrumentation = { xssCalls: [], longTasks: [], live: [], focus: [], marks: {}, longTaskSupported: false };
  Object.defineProperty(window, "__km", { value: km, writable: false, configurable: false });
  Object.defineProperty(window, "__kmXss", {
    value: (id: string) => {
      km.xssCalls.push(String(id));
    },
    writable: false,
    configurable: false,
  });
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) km.longTasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: "longtask", buffered: true });
    km.longTaskSupported = true;
  } catch {
    km.longTaskSupported = false;
  }
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      km.focus.push({ t: performance.now(), testid: target?.getAttribute("data-testid") ?? null, tag: target?.tagName.toLowerCase() ?? "unknown" });
    },
    true,
  );
  let lastLive = "";
  const recordLive = (): void => {
    const region = document.querySelector('[data-testid="km-live-region"]');
    const text = (region?.textContent ?? "").trim();
    if (text !== lastLive) {
      lastLive = text;
      km.live.push({ t: performance.now(), text });
    }
  };
  const start = (): void => {
    new MutationObserver(recordLive).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.documentElement === null) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
