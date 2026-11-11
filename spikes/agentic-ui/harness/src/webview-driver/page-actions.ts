/**
 * In-page equivalents of checks/support/{prototype-page,interactions,conformance}.ts
 * and the hostile selector checks, for a webview without WebDriver. Concatenated
 * into the driver script by build-driver.ts (imports and `export` stripped).
 *
 * Known difference from Playwright: there is no trusted input. Text is set with
 * the native value setter plus an `input` event, clicks are element.click(), and
 * keyboard approvals are focus() + click() (recorded as a deviation).
 */
import type { ExpectedOutcome } from "../domain/expected.ts";
import type { HostileItem } from "../domain/hostile.ts";
import type { Interaction } from "../domain/scenario.ts";
import type { RunStatus, SpikeSnapshot } from "../domain/spike-probe.ts";

export const KM_SETTLED: readonly RunStatus[] = ["finished", "interrupted", "cancelled", "error"];

export function kmSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls `probe` every `everyMs` until it returns a non-null value. */
export async function kmPoll<T>(label: string, probe: () => T | null | Promise<T | null>, timeoutMs: number, everyMs = 100): Promise<T> {
  const started = performance.now();
  for (;;) {
    const value = await probe();
    if (value !== null) return value;
    if (performance.now() - started > timeoutMs) throw new Error(`timed out after ${timeoutMs} ms: ${label}`);
    await kmSleep(everyMs);
  }
}

export function kmSnapshot(): SpikeSnapshot {
  const probe = window.__spike;
  if (probe === undefined) throw new Error("window.__spike missing");
  return probe.snapshot();
}

export function kmWaitStatus(statuses: readonly RunStatus[], timeoutMs = 60_000, everyMs = 100): Promise<{ status: RunStatus; at: number }> {
  return kmPoll(`runStatus in ${statuses.join("|")}`, () => {
    const status = window.__spike?.snapshot().runStatus;
    return status !== undefined && statuses.includes(status) ? { status, at: performance.now() } : null;
  }, timeoutMs, everyMs);
}

export function kmWaitSettled(exclude: readonly RunStatus[] = [], timeoutMs = 60_000, everyMs = 100): Promise<{ status: RunStatus; at: number }> {
  return kmWaitStatus(KM_SETTLED.filter((s) => !exclude.includes(s)), timeoutMs, everyMs);
}

export function kmWaitAssistantText(chars: number, timeoutMs = 30_000): Promise<true> {
  return kmPoll(`assistant text >= ${chars}`, () => (kmSnapshot().messages.some((m) => m.role === "assistant" && m.text.length >= chars) ? true : null), timeoutMs, 50);
}

/**
 * Resolves inside the MutationObserver callback in which `probe` first returns non-null, so the
 * continuation runs as a microtask of the task that changed the DOM (no clamped timer in a hidden
 * page). The timeout is a setTimeout and may itself be clamped; it only bounds failures.
 */
export function kmWaitDom<T>(label: string, probe: () => T | null, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const first = probe();
    if (first !== null) {
      resolve(first);
      return;
    }
    const observer = new MutationObserver(() => {
      const value = probe();
      if (value === null) return;
      observer.disconnect();
      clearTimeout(timer);
      resolve(value);
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`timed out after ${timeoutMs} ms: ${label}`));
    }, timeoutMs);
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  });
}

/** kmWaitAssistantText driven by DOM mutations instead of a 50 ms poll (the cancel trigger). */
export function kmWaitAssistantTextOnMutation(chars: number, timeoutMs = 30_000): Promise<true> {
  return kmWaitDom(`assistant text >= ${chars}`, () => (kmSnapshot().messages.some((m) => m.role === "assistant" && m.text.length >= chars) ? true : null), timeoutMs);
}

interface SessionView {
  readonly log: { readonly requests: readonly { readonly outcome: string }[] };
  readonly summary: { readonly requestCount: number };
}

async function kmSession(harnessUrl: string, sessionId: string): Promise<SessionView | null> {
  const res = await fetch(`${harnessUrl}/sessions/${encodeURIComponent(sessionId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /sessions/${sessionId} -> ${res.status}`);
  const body: SessionView = (await res.json()) as SessionView;
  return body;
}

export async function kmRequestCount(harnessUrl: string, sessionId: string): Promise<number> {
  return (await kmSession(harnessUrl, sessionId))?.summary.requestCount ?? 0;
}

export function kmWaitRequestsAbove(harnessUrl: string, sessionId: string, previous: number): Promise<number> {
  return kmPoll(`requests > ${previous}`, async () => {
    const n = await kmRequestCount(harnessUrl, sessionId);
    return n > previous ? n : null;
  }, 15_000, 100);
}

export function kmWaitServerIdle(harnessUrl: string, sessionId: string): Promise<true> {
  return kmPoll("server responses finished", async () => {
    const s = await kmSession(harnessUrl, sessionId);
    return (s?.log.requests.filter((r) => r.outcome === "in-progress").length ?? 0) === 0 ? true : null;
  }, 60_000, 100);
}

export function kmByTestId(testId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (el === null) throw new Error(`[data-testid="${testId}"] not found`);
  return el;
}

/** Sets a React-controlled input/textarea the way typing would (native setter + input event). */
export function kmSetValue(el: Element, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter === undefined) throw new Error("no native value setter");
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export async function kmSubmitPrompt(text: string): Promise<void> {
  kmSetValue(kmByTestId("km-composer-input"), text);
  const submit = await kmPoll("submit enabled", () => {
    const b = document.querySelector<HTMLButtonElement>('[data-testid="km-composer-submit"]');
    return b !== null && !b.disabled && b.getAttribute("aria-disabled") !== "true" ? b : null;
  }, 5_000, 20);
  submit.click();
}

function kmApprovalCard(interruptId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-testid="km-approval"][data-interrupt-id="${interruptId}"]`);
}

function kmA2uiComponent(surfaceId: string, componentId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="km-a2ui-surface"][data-surface-id="${surfaceId}"] [data-a2ui-id="${componentId}"]`);
  if (el === null) throw new Error(`A2UI component ${surfaceId}/${componentId} not found`);
  return el;
}

/** What a pointer click at the component's centre would hit: the element itself if interactive, else its first button. */
function kmClickTarget(el: HTMLElement): HTMLElement {
  if (el.matches("button, [role=button], input, a")) return el;
  return el.querySelector<HTMLElement>("button, [role=button]") ?? el;
}

export async function kmPerformInteraction(harnessUrl: string, sessionId: string, interaction: Interaction, deviations: string[]): Promise<void> {
  switch (interaction.do) {
    case "approve":
    case "reject": {
      const card = await kmPoll(`approval ${interaction.interruptId} pending`, () => {
        const c = kmApprovalCard(interaction.interruptId);
        return c?.getAttribute("data-status") === "pending" ? c : null;
      }, 10_000);
      const button = card.querySelector<HTMLElement>(`[data-testid="${interaction.do === "approve" ? "km-approval-approve" : "km-approval-reject"}"]`);
      if (button === null) throw new Error(`${interaction.do} button missing`);
      const before = await kmRequestCount(harnessUrl, sessionId);
      button.focus();
      if (document.activeElement !== button) deviations.push(`${interaction.do}: button did not take focus()`);
      if (interaction.via === "keyboard") deviations.push(`${interaction.do}: keyboard activation replaced by focus() + click() (no trusted key events without WebDriver)`);
      button.click();
      await kmWaitRequestsAbove(harnessUrl, sessionId, before);
      await kmWaitServerIdle(harnessUrl, sessionId);
      await kmWaitSettled(["interrupted"]);
      return;
    }
    case "wait-for-expiry":
      await kmPoll(`approval ${interaction.interruptId} expired`, () => (kmApprovalCard(interaction.interruptId)?.getAttribute("data-status") === "expired" ? true : null), 20_000);
      return;
    case "cancel-run":
      await kmWaitAssistantTextOnMutation(interaction.afterTextChars);
      kmByTestId("km-cancel-run").click();
      await kmWaitSettled(["interrupted"]);
      return;
    case "a2ui-click": {
      for (const [componentId, value] of Object.entries(interaction.fill ?? {})) {
        const host = kmA2uiComponent(interaction.surfaceId, componentId);
        const field = host.matches("input, textarea") ? host : host.querySelector("input, textarea");
        if (field === null) throw new Error(`A2UI ${componentId} has no input`);
        kmSetValue(field, value);
      }
      const before = await kmRequestCount(harnessUrl, sessionId);
      kmClickTarget(kmA2uiComponent(interaction.surfaceId, interaction.componentId)).click();
      deviations.push("a2ui-click: element.click() on the component's button instead of a pointer click at its centre");
      await kmWaitRequestsAbove(harnessUrl, sessionId, before);
      await kmWaitServerIdle(harnessUrl, sessionId);
      await kmWaitSettled();
      return;
    }
  }
}

function kmTranscript(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid="km-transcript"]');
}

/** checks/support/conformance.ts domProblems + forbiddenTextProblems. */
export function kmDomProblems(expected: ExpectedOutcome): string[] {
  const root = kmTranscript();
  if (root === null) return ["<transcript missing>"];
  const problems: string[] = [];
  for (const a of expected.dom ?? []) {
    const matches = [...root.querySelectorAll<HTMLElement>(a.selector)];
    if (a.count !== undefined && matches.length !== a.count) problems.push(`dom ${a.selector}: expected ${a.count}, found ${matches.length}`);
    if (a.minCount !== undefined && matches.length < a.minCount) problems.push(`dom ${a.selector}: expected at least ${a.minCount}, found ${matches.length}`);
    if (a.textIncludes !== undefined && !matches.some((m) => m.innerText.includes(a.textIncludes ?? ""))) {
      problems.push(`dom ${a.selector}: no match contains ${JSON.stringify(a.textIncludes)}`);
    }
  }
  const text = root.textContent ?? "";
  for (const f of expected.forbiddenText ?? []) if (text.includes(f)) problems.push(`forbidden text rendered: ${JSON.stringify(f)}`);
  return problems;
}

/** checks/hostile.spec.ts selectorProblems. */
export function kmHostileProblems(item: HostileItem, globalForbidden: readonly string[]): string[] {
  const root = kmTranscript();
  if (root === null) return ["<transcript missing>"];
  const problems: string[] = [];
  for (const selector of [...globalForbidden, ...(item.assert.forbiddenSelectors ?? [])]) {
    const count = root.querySelectorAll(selector).length;
    if (count > 0) problems.push(`forbidden ${selector} matched ${count}`);
  }
  for (const req of item.assert.requiredSelectors ?? []) {
    const count = root.querySelectorAll(req.selector).length;
    if (req.count !== undefined && count !== req.count) problems.push(`required ${req.selector}: expected ${req.count}, found ${count}`);
    if (req.minCount !== undefined && count < req.minCount) problems.push(`required ${req.selector}: expected at least ${req.minCount}, found ${count}`);
  }
  const text = root.innerText;
  for (const t of item.assert.mustShowText ?? []) if (!text.includes(t)) problems.push(`text not shown: ${JSON.stringify(t)}`);
  return problems;
}

/** checks/support/hostile-guards.ts eventHandlerAttributes. */
export function kmOnAttributes(): string[] {
  const root = kmTranscript();
  if (root === null) return ["<transcript missing>"];
  const found: string[] = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const attr of el.getAttributeNames()) if (attr.toLowerCase().startsWith("on")) found.push(`${el.tagName.toLowerCase()}[${attr}]`);
  }
  return found;
}

/** Resource-timing entries outside the page origin, the harness origin and data:/blob:/about:. */
export function kmDisallowedRequests(harnessUrl: string): string[] {
  const harness = new URL(harnessUrl);
  return performance.getEntriesByType("resource").flatMap((entry) => {
    const url = new URL(entry.name, location.href);
    if (["data:", "blob:", "about:"].includes(url.protocol)) return [];
    const samePage = url.protocol === location.protocol && url.host === location.host;
    const toHarness = url.protocol === harness.protocol && url.host === harness.host;
    return samePage || toHarness ? [] : [`${(entry as PerformanceResourceTiming).initiatorType} ${entry.name}`];
  });
}
