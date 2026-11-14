/**
 * In-webview instrumentation for the Tauri driver (task 15.5). Concatenated into
 * one classic script by build-driver.ts (imports and `export` keywords are
 * stripped there), and it runs at document start (Tauri initialization script) before
 * any prototype code. It mirrors checks/support/page-instrumentation.ts and
 * src/measure/page-timeline.ts:
 *   __kmXss sentinel, dialogs, CSP violations, submit/first-token timeline,
 *   long tasks (where supported).
 */
import type { CspViolationRecord } from "../domain/spike-report.ts";

export interface WebviewInstrumentation {
  readonly xssCalls: string[];
  readonly dialogs: string[];
  readonly csp: CspViolationRecord[];
  readonly longTasks: { start: number; duration: number }[];
  longTaskSupported: boolean;
  submitAt: number | null;
  firstTokenAt: number | null;
  ownNavigation: boolean;
  readonly frames: number[];
  /**
   * Event-driven render-complete of the first settle (gate 16.1 follow-up): the first
   * MutationObserver callback after submit in which km-transcript is no longer aria-busy
   * (after having been busy) and __spike.snapshot().runStatus is settled. The callback
   * runs as a microtask of the task that committed the DOM change, so no timer clamping
   * (hidden pages clamp setTimeout to ~1 s) can delay the timestamp.
   */
  renderSettle: { at: number; status: string } | null;
  sawBusy: boolean;
  readonly settleWaiters: ((s: { at: number; status: string }) => void)[];
}

/** Run statuses that count as settled (page-actions.ts KM_SETTLED; repeated: this file runs first). */
const KM_SETTLED_STATUSES = ["finished", "interrupted", "cancelled", "error"];

function kmObserveSettle(w: WebviewInstrumentation): void {
  const check = (): void => {
    if (w.submitAt === null || w.renderSettle !== null) return;
    const transcript = document.querySelector('[data-testid="km-transcript"]');
    if (transcript === null) return;
    if (transcript.getAttribute("aria-busy") === "true") {
      w.sawBusy = true;
      return;
    }
    // snapshot() only runs while the transcript is not busy, so a streaming run pays nothing.
    const status = (window as Window & { __spike?: { snapshot(): { runStatus: string } } }).__spike?.snapshot().runStatus;
    if (status === undefined || !KM_SETTLED_STATUSES.includes(status) || !w.sawBusy) return;
    w.renderSettle = { at: performance.now(), status };
    observer.disconnect();
    for (const resolve of w.settleWaiters.splice(0)) resolve(w.renderSettle);
  };
  const observer = new MutationObserver(check);
  const start = (): void =>
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-busy", "data-status"] });
  if (document.documentElement === null) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

/** Resolves at the event-driven render-complete of the first settle (see renderSettle). */
export function kmWaitRenderSettle(w: WebviewInstrumentation): Promise<{ at: number; status: string }> {
  return w.renderSettle !== null ? Promise.resolve(w.renderSettle) : new Promise((resolve) => w.settleWaiters.push(resolve));
}

export function kmStartFrameProbe(w: WebviewInstrumentation): void {
  const tick = (t: number): void => {
    w.frames.push(t);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function kmInstallInstrumentation(): WebviewInstrumentation {
  const w: WebviewInstrumentation = {
    xssCalls: [],
    dialogs: [],
    csp: [],
    longTasks: [],
    longTaskSupported: false,
    submitAt: null,
    firstTokenAt: null,
    ownNavigation: false,
    frames: [],
    renderSettle: null,
    sawBusy: false,
    settleWaiters: [],
  };
  Object.defineProperty(window, "__kmXss", {
    value: (id: string) => {
      w.xssCalls.push(String(id));
    },
    writable: false,
    configurable: false,
  });

  // No WebDriver dialog events here: record any call a payload manages to make.
  const recordDialog = (kind: string, message: unknown): void => {
    w.dialogs.push(`${kind}: ${String(message ?? "")}`);
  };
  window.alert = (message?: unknown): void => recordDialog("alert", message);
  window.confirm = (message?: string): boolean => {
    recordDialog("confirm", message);
    return false;
  };
  window.prompt = (message?: string): string | null => {
    recordDialog("prompt", message);
    return null;
  };

  document.addEventListener(
    "securitypolicyviolation",
    (event: SecurityPolicyViolationEvent) => {
      w.csp.push({
        directive: event.effectiveDirective || event.violatedDirective,
        blockedUri: event.blockedURI,
        sourceFile: event.sourceFile,
        line: event.lineNumber,
        sample: event.sample,
        disposition: event.disposition,
        at: performance.now(),
      });
    },
    true,
  );

  // WebKit accepts observe({ type: "longtask" }) without throwing but never emits entries.
  if (PerformanceObserver.supportedEntryTypes.includes("longtask")) try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.longTasks.push({ start: e.startTime, duration: e.duration });
    }).observe({ type: "longtask", buffered: true });
    w.longTaskSupported = true;
  } catch {
    w.longTaskSupported = false;
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-testid="km-composer-submit"]') != null && w.submitAt === null) w.submitAt = performance.now();
    },
    true,
  );
  const observer = new MutationObserver(() => {
    if (w.submitAt === null || w.firstTokenAt !== null) return;
    const message = document.querySelector('[data-testid="km-message"][data-role="assistant"]');
    if ((message?.textContent ?? "").trim().length > 0) {
      w.firstTokenAt = performance.now();
      observer.disconnect();
    }
  });
  const start = (): void => observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  if (document.documentElement === null) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  kmObserveSettle(w);
  return w;
}
