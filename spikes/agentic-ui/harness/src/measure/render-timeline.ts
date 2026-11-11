/**
 * Gate 16.3 in-page instrumentation, installed as an init script. Playwright serialises the function,
 * so it must not close over anything. All times are performance.now() milliseconds.
 *
 * From the submit click until `stop()` it records:
 *   - every DOM mutation (childList, characterData, attributes) as lastMutationAt / mutationCount;
 *   - long tasks (PerformanceObserver "longtask", where supported);
 *   - every requestAnimationFrame timestamp (frame deltas give dropped frames);
 *   - keydown event-to-next-paint latency (rAF, then a MessageChannel task after it), and Event Timing
 *     entries for keydown where the engine supports them;
 *   - first assistant text (firstTokenAt), as page-timeline.ts does.
 *
 * `waitRenderComplete(settleAt, quietMs, maxMs)` resolves once, after settle, there has been no
 * mutation and no long task for `quietMs`, at least two animation frames and one idle callback have
 * run since the last activity. renderCompleteAt is the last activity (mutation, long-task end or
 * settle), not the moment the quiet period was confirmed.
 */

export interface InputSample {
  readonly at: number;
  latency: number | null;
  eventTimingDuration: number | null;
  eventTimingInputDelay: number | null;
}

export interface RenderTimeline {
  submitAt: number | null;
  firstTokenAt: number | null;
  lastMutationAt: number | null;
  mutationCount: number;
  longTasks: { start: number; duration: number }[];
  longTaskSupported: boolean;
  eventTimingSupported: boolean;
  idleCallbackSupported: boolean;
  frames: number[];
  inputs: InputSample[];
  stopped: boolean;
  stop(): void;
  waitRenderComplete(settleAt: number, quietMs: number, maxMs: number): Promise<RenderCompleteResult>;
}

export interface RenderCompleteResult {
  readonly renderCompleteAt: number;
  readonly confirmedAt: number;
  readonly timedOut: boolean;
}

declare global {
  interface Window {
    __kmRender?: RenderTimeline;
  }
}

export function installRenderTimeline(): void {
  const t: RenderTimeline = {
    submitAt: null,
    firstTokenAt: null,
    lastMutationAt: null,
    mutationCount: 0,
    longTasks: [],
    longTaskSupported: false,
    eventTimingSupported: false,
    idleCallbackSupported: typeof window.requestIdleCallback === "function",
    frames: [],
    inputs: [],
    stopped: false,
    stop: () => {
      t.stopped = true;
    },
    waitRenderComplete: () => Promise.reject(new Error("not installed")),
  };
  Object.defineProperty(window, "__kmRender", { value: t, writable: false, configurable: false });
  const active = (): boolean => t.submitAt !== null && !t.stopped;
  const types = PerformanceObserver.supportedEntryTypes;
  // Guard on supportedEntryTypes: WKWebView accepts an unsupported type without throwing.
  if (types.includes("longtask")) {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (active()) t.longTasks.push({ start: e.startTime, duration: e.duration });
      }).observe({ type: "longtask", buffered: true });
      t.longTaskSupported = true;
    } catch {
      t.longTaskSupported = false;
    }
  }
  if (types.includes("event")) {
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.name !== "keydown" || !("processingStart" in e)) continue;
          const sample = t.inputs.find((s) => Math.abs(s.at - e.startTime) < 1);
          if (sample === undefined) continue;
          sample.eventTimingDuration = e.duration;
          sample.eventTimingInputDelay = (e as PerformanceEventTiming).processingStart - e.startTime;
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      t.eventTimingSupported = true;
    } catch {
      t.eventTimingSupported = false;
    }
  }
  const frameLoop = (now: number): void => {
    if (t.stopped) return;
    t.frames.push(now);
    requestAnimationFrame(frameLoop);
  };
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-testid="km-composer-submit"]') == null || t.submitAt !== null) return;
      t.submitAt = performance.now();
      requestAnimationFrame(frameLoop);
    },
    true,
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (!active()) return;
      const sample: InputSample = { at: event.timeStamp, latency: null, eventTimingDuration: null, eventTimingInputDelay: null };
      t.inputs.push(sample);
      requestAnimationFrame(() => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          sample.latency = performance.now() - sample.at;
          channel.port1.close();
        };
        channel.port2.postMessage(0);
      });
    },
    true,
  );
  const observer = new MutationObserver((records) => {
    if (!active()) return;
    t.lastMutationAt = performance.now();
    t.mutationCount += records.length;
    if (t.firstTokenAt === null) {
      const message = document.querySelector('[data-testid="km-message"][data-role="assistant"]');
      if ((message?.textContent ?? "").trim().length > 0) t.firstTokenAt = t.lastMutationAt;
    }
  });
  const start = (): void =>
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  if (document.documentElement === null) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  t.waitRenderComplete = (settleAt, quietMs, maxMs) =>
    new Promise<RenderCompleteResult>((resolve) => {
      const lastActivity = (): number => {
        const lastTask = t.longTasks.reduce((m, x) => Math.max(m, x.start + x.duration), 0);
        return Math.max(settleAt, t.lastMutationAt ?? 0, lastTask);
      };
      let seenActivity = lastActivity();
      let framesSince = 0;
      let idleSince = false;
      const armIdle = (): void => {
        const mark = seenActivity;
        const onIdle = (): void => {
          if (mark === seenActivity) idleSince = true;
        };
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(onIdle, { timeout: quietMs });
        else setTimeout(onIdle, 0);
      };
      armIdle();
      const tick = (): void => {
        const now = performance.now();
        const activity = lastActivity();
        if (activity !== seenActivity) {
          seenActivity = activity;
          framesSince = 0;
          idleSince = false;
          armIdle();
        } else {
          framesSince += 1;
        }
        const quiet = now - seenActivity >= quietMs && framesSince >= 2 && idleSince;
        const timedOut = now - settleAt >= maxMs;
        if (quiet || timedOut) {
          resolve({ renderCompleteAt: seenActivity, confirmedAt: now, timedOut: !quiet });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
}
