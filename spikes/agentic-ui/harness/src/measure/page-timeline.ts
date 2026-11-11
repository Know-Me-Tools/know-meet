/**
 * Lightweight in-page timeline for measurement (installed as an init script,
 * serialised by Playwright, so it must not close over anything):
 *   submitAt      click on [data-testid="km-composer-submit"] (capture phase)
 *   firstTokenAt  first non-empty text inside an assistant message element
 *   longTasks     PerformanceObserver "longtask" (Chromium only)
 * All times are performance.now() milliseconds.
 */

export interface KmTimeline {
  submitAt: number | null;
  firstTokenAt: number | null;
  longTasks: { start: number; duration: number }[];
  longTaskSupported: boolean;
}

declare global {
  interface Window {
    __kmTimeline?: KmTimeline;
  }
}

export function installTimeline(): void {
  const timeline: KmTimeline = { submitAt: null, firstTokenAt: null, longTasks: [], longTaskSupported: false };
  Object.defineProperty(window, "__kmTimeline", { value: timeline, writable: false, configurable: false });
  // Guard on supportedEntryTypes: WKWebView accepts an unsupported type without throwing.
  if (PerformanceObserver.supportedEntryTypes.includes("longtask")) try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) timeline.longTasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: "longtask", buffered: true });
    timeline.longTaskSupported = true;
  } catch {
    timeline.longTaskSupported = false;
  }
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-testid="km-composer-submit"]') != null && timeline.submitAt === null) timeline.submitAt = performance.now();
    },
    true,
  );
  const observer = new MutationObserver(() => {
    if (timeline.submitAt === null || timeline.firstTokenAt !== null) return;
    const message = document.querySelector('[data-testid="km-message"][data-role="assistant"]');
    if ((message?.textContent ?? "").trim().length > 0) {
      timeline.firstTokenAt = performance.now();
      observer.disconnect();
    }
  });
  const start = (): void => observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  if (document.documentElement === null) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
