/**
 * Gate 16.4 (c16): in-webview accessibility agent for the Tauri shell. It is the
 * passive half of the trusted-input runner (a11y-run.ts): the runner sends real
 * OS key presses and pointer clicks (CoreGraphics events, isTrusted == true); this
 * script only observes and reports to the collector (POST /spike-report events):
 *   - MutationObserver logs: km-live-region text, km-transcript aria-busy;
 *   - focusin, keydown and click logs (with isTrusted);
 *   - an automatic sample at 200 streamed characters (aria-busy, live ancestors)
 *     and, for the stream kind, an axe scan at 2,000 characters (mid-stream);
 *   - automatic state posts at ready, at every settle and when an approval is pending.
 * Commands arrive as trusted key presses: F19 posts the state, F18 runs axe then
 * posts the state, F17 posts the final logs, F16 posts a `result` report that the
 * collector judges with the Playwright comparison (compare.ts).
 * Concatenated with ../instrumentation.ts and ../page-actions.ts into one classic
 * script by build-a11y-agent.ts (imports and `export` keywords stripped there).
 */
import type { RunStatus } from "../../domain/spike-probe.ts";
import type { ScenarioFile } from "../../domain/scenario.ts";
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import type { A11yAgentConfig, A11yFinal, A11yState, AlertInfo, ApprovalView, AxeRecord, BusyRecord, ClickRecord, ElementDesc, FocusRecord, KeyRecord, LiveRecord, StreamSample, TargetRect } from "./a11y-types.ts";
import { kmInstallInstrumentation, type WebviewInstrumentation } from "../instrumentation.ts";
import { kmDisallowedRequests, kmDomProblems, kmPoll } from "../page-actions.ts";

const KM_A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const KM_LIVE_ROLES = ["log", "status", "alert", "marquee", "timer"];
const KM_SETTLED_STATUSES: readonly RunStatus[] = ["finished", "interrupted", "cancelled", "error"];
const KM_FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"], [role="checkbox"], [role="button"]';

interface KmAxeResult {
  violations: { id: string; impact?: string | null; help: string; nodes: { target: unknown[] }[] }[];
}
interface KmAxe {
  run(context: Document, options: { runOnly: { type: "tag"; values: string[] } }): Promise<KmAxeResult>;
}

interface KmA11yLogs {
  readonly live: LiveRecord[];
  readonly busy: BusyRecord[];
  readonly focus: FocusRecord[];
  readonly keys: KeyRecord[];
  readonly clicks: ClickRecord[];
  readonly axe: AxeRecord[];
  readonly statuses: { t: number; status: RunStatus }[];
  readonly errors: string[];
  firstTextAt: number | null;
  sample200: StreamSample | null;
  midStreamAxe: boolean;
  seq: number;
  lastStatus: RunStatus | null;
  pendingPosted: Set<string>;
  scenario: ScenarioFile | null;
  surface: GoldenSurfaceFile | null;
}

function kmText(el: Element | null): string {
  return ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** A small accessible-name approximation (aria-label, labelledby, label, placeholder, text, title). */
function kmName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria !== null && aria.trim() !== "") return aria.trim();
  const by = el.getAttribute("aria-labelledby");
  if (by !== null) return by.split(/\s+/).map((id) => kmText(document.getElementById(id))).join(" ").trim();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const label = (el.id !== "" ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null) ?? el.closest("label");
    if (label !== null) return kmText(label);
    return el.placeholder;
  }
  return (kmText(el) || el.getAttribute("title") || "").slice(0, 80);
}

function kmDescribe(el: Element | null): ElementDesc {
  if (el === null) return { tag: "none", testid: null, role: null, name: "", a2uiId: null, interruptId: null, type: null };
  return {
    tag: el.tagName.toLowerCase(),
    testid: el.getAttribute("data-testid"),
    role: el.getAttribute("role"),
    name: kmName(el).slice(0, 80),
    a2uiId: el.closest("[data-a2ui-id]")?.getAttribute("data-a2ui-id") ?? null,
    interruptId: el.closest('[data-testid="km-approval"]')?.getAttribute("data-interrupt-id") ?? null,
    type: el.getAttribute("type"),
  };
}

function kmVisible(el: Element): boolean {
  if (el.getClientRects().length === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** Sequential focus navigation order a browser with full keyboard access would use (tabindex >= 0, DOM order). */
function kmFocusables(): ElementDesc[] {
  const all = [...document.querySelectorAll<HTMLElement>(KM_FOCUSABLE)].filter((el) => {
    if ((el as HTMLButtonElement).disabled === true || el.closest("[inert]") !== null || !kmVisible(el)) return false;
    const ti = el.getAttribute("tabindex");
    if (ti !== null && Number(ti) < 0) return false;
    if ((el.getAttribute("role") === "checkbox" || el.getAttribute("role") === "button") && ti === null && !el.matches("button, input, a[href]")) return false;
    return true;
  });
  return all.map(kmDescribe);
}

function kmRect(el: Element | null): TargetRect | null {
  if (el === null) return null;
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0 ? null : { x: r.left, y: r.top, w: r.width, h: r.height };
}

function kmTargets(): Record<string, TargetRect> {
  const out: Record<string, TargetRect> = {};
  const put = (key: string, el: Element | null): void => {
    const r = kmRect(el);
    if (r !== null) out[key] = r;
  };
  for (const id of ["km-composer-input", "km-composer-submit", "km-cancel-run"]) put(id, document.querySelector(`[data-testid="${id}"]`));
  for (const card of document.querySelectorAll('[data-testid="km-approval"]')) {
    const id = card.getAttribute("data-interrupt-id") ?? "?";
    put(`approve:${id}`, card.querySelector('[data-testid="km-approval-approve"]'));
    put(`reject:${id}`, card.querySelector('[data-testid="km-approval-reject"]'));
  }
  for (const host of document.querySelectorAll('[data-testid="km-a2ui-surface"] [data-a2ui-id]')) {
    const id = host.getAttribute("data-a2ui-id") ?? "?";
    const field = host.matches("input, textarea") ? host : host.querySelector("input:not([type=checkbox]), textarea");
    const box = host.matches("input[type=checkbox], [role=checkbox]") ? host : host.querySelector("input[type=checkbox], [role=checkbox]");
    const button = host.matches("button, [role=button]") ? host : host.querySelector("button, [role=button]");
    put(`a2ui:${id}`, host);
    if (field !== null) put(`field:${id}`, field);
    if (box !== null) {
      const r = kmRect(box);
      put(`checkbox:${id}`, r !== null && r.w >= 8 && r.h >= 8 ? box : (box.closest("label") ?? host));
    }
    if (button !== null) put(`button:${id}`, button);
  }
  return out;
}

function kmApprovals(): ApprovalView[] {
  return [...document.querySelectorAll('[data-testid="km-approval"]')].map((card) => {
    const approve = card.querySelector<HTMLButtonElement>('[data-testid="km-approval-approve"]');
    const reject = card.querySelector('[data-testid="km-approval-reject"]');
    return {
      interruptId: card.getAttribute("data-interrupt-id") ?? "?",
      status: card.getAttribute("data-status") ?? "?",
      approveName: approve === null ? "" : kmName(approve),
      rejectName: reject === null ? "" : kmName(reject),
      approveDisabled: approve === null ? true : approve.disabled || approve.getAttribute("aria-disabled") === "true",
    };
  });
}

function kmRunStatus(): RunStatus | null {
  try {
    return window.__spike?.snapshot().runStatus ?? null;
  } catch {
    return null;
  }
}

function kmTranscriptEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid="km-transcript"]');
}

function kmVisibleTexts(logs: KmA11yLogs): Record<string, boolean> {
  const texts = [...(logs.surface?.expected.visibleText ?? []), ...(logs.surface?.interactions.flatMap((i) => i.expectVisibleText ?? []) ?? [])];
  const shown = kmTranscriptEl()?.innerText ?? "";
  return Object.fromEntries(texts.map((t) => [t, shown.includes(t)]));
}

async function kmA11yPost(config: A11yAgentConfig, event: string, detail: unknown): Promise<void> {
  const body = { kind: "event", runId: config.runId, step: null, event, detail: JSON.stringify(detail) };
  const res = await fetch(`${config.harnessUrl}/spike-report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST /spike-report ${event} -> ${res.status}`);
}

/** axe.run rejects ("Axe is already running") when called concurrently, so runs are serialized. */
let kmAxeQueue: Promise<void> = Promise.resolve();

function kmRunAxe(logs: KmA11yLogs, label: string): Promise<void> {
  const next = kmAxeQueue.then(() => kmRunAxeNow(logs, label));
  kmAxeQueue = next.catch(() => undefined);
  return next;
}

async function kmRunAxeNow(logs: KmA11yLogs, label: string): Promise<void> {
  const axe = (window as Window & { axe?: KmAxe }).axe;
  if (axe === undefined) {
    logs.errors.push(`axe missing for ${label}`);
    return;
  }
  const t = performance.now();
  const result = await axe.run(document, { runOnly: { type: "tag", values: KM_A11Y_TAGS } });
  logs.axe.push({
    t,
    label,
    runStatus: kmRunStatus(),
    pendingApprovals: kmApprovals().filter((a) => a.status === "pending").length,
    violations: result.violations.map((v) => `${v.id} (${v.impact ?? "n/a"}): ${v.nodes.length} node(s) - ${v.help}`),
    nodes: result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${JSON.stringify(n.target)}`)),
  });
}

function kmState(logs: KmA11yLogs, reason: string): A11yState {
  logs.seq += 1;
  let surfaces: A11yState["a2uiSurfaces"] = [];
  try {
    surfaces = window.__spike?.snapshot().a2uiSurfaces ?? [];
  } catch {
    surfaces = [];
  }
  return {
    seq: logs.seq,
    t: performance.now(),
    reason,
    active: kmDescribe(document.activeElement),
    runStatus: kmRunStatus(),
    approvals: kmApprovals(),
    targets: kmTargets(),
    viewport: { w: innerWidth, h: innerHeight, scrollY },
    focusables: kmFocusables(),
    visibleText: kmVisibleTexts(logs),
    a2uiSurfaces: surfaces,
    hasFocus: document.hasFocus(),
    axeRuns: logs.axe.length,
    composer: document.querySelector<HTMLInputElement>('[data-testid="km-composer-input"]')?.value ?? "",
  };
}

function kmAlert(): AlertInfo {
  const alerts = [...(kmTranscriptEl()?.querySelectorAll('[role="alert"]') ?? [])];
  const first = alerts[0] ?? null;
  return { count: alerts.length, visible: first !== null && kmVisible(first), text: kmText(first).slice(0, 200) };
}

function kmFinal(config: A11yAgentConfig, w: WebviewInstrumentation, logs: KmA11yLogs): A11yFinal {
  const regions = [...document.querySelectorAll('[data-testid="km-live-region"]')];
  let snapshot: A11yFinal["snapshot"] = null;
  try {
    snapshot = window.__spike?.snapshot() ?? null;
  } catch (e: unknown) {
    logs.errors.push(`snapshot: ${String(e)}`);
  }
  return {
    t: performance.now(),
    live: logs.live,
    busy: logs.busy,
    focus: logs.focus,
    keys: logs.keys,
    clicks: logs.clicks,
    axe: logs.axe,
    statuses: logs.statuses,
    firstTextAt: logs.firstTextAt,
    sample200: logs.sample200,
    liveRegion: { count: regions.length, ariaLive: regions[0]?.getAttribute("aria-live") ?? null, role: regions[0]?.getAttribute("role") ?? null },
    alert: kmAlert(),
    transcriptBusy: kmTranscriptEl()?.getAttribute("aria-busy") ?? null,
    resources: performance.getEntriesByType("resource").map((e) => e.name),
    disallowedRequests: kmDisallowedRequests(config.harnessUrl),
    domProblems: logs.scenario === null ? ["scenario not loaded"] : kmDomProblems(logs.scenario.expected),
    csp: w.csp.map((c) => ({ directive: c.directive, blockedUri: c.blockedUri })),
    snapshot,
    userAgent: navigator.userAgent,
    errors: logs.errors,
  };
}

/** The same `result` report the conformance driver posts, so the collector judges it (compare.ts). */
async function kmJudge(config: A11yAgentConfig, w: WebviewInstrumentation, final: A11yFinal, startedAtEpochMs: number): Promise<void> {
  const report = {
    kind: "result", runId: config.runId, prototype: config.prototype, step: 0, scenarioId: config.scenarioId, repeat: 1, mode: "conformance",
    sessionId: config.sessionId, startedAtEpochMs, attempt: 1, snapshot: final.snapshot, metrics: null,
    client: { domProblems: final.domProblems, hostileProblems: [], xssCalls: [...w.xssCalls], dialogs: [...w.dialogs], disallowedRequests: final.disallowedRequests, onAttributes: [], finalizeMs: null, deviations: [] },
    csp: [...w.csp], axe: null, userAgent: navigator.userAgent, error: null,
  };
  const res = await fetch(`${config.harnessUrl}/spike-report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(report) });
  if (!res.ok) throw new Error(`POST result -> ${res.status}`);
}

function kmLiveAncestors(): string[] {
  const streaming = document.querySelector('[data-testid="km-message"][data-status="streaming"]');
  if (streaming === null) return ["<no streaming message>"];
  const found: string[] = [];
  for (let el: Element | null = streaming; el !== null; el = el.parentElement) {
    const live = el.getAttribute("aria-live");
    const role = el.getAttribute("role");
    if ((live !== null && live !== "off") || (role !== null && KM_LIVE_ROLES.includes(role))) found.push(`${el.tagName.toLowerCase()}[aria-live=${live ?? ""}][role=${role ?? ""}]`);
  }
  return found;
}

function kmInstallLogs(logs: KmA11yLogs): void {
  let lastLive: string | null = null;
  let lastBusy: string | null | undefined;
  const observe = (): void => {
    const region = document.querySelector('[data-testid="km-live-region"]');
    const text = (region?.textContent ?? "").trim();
    if (region !== null && text !== lastLive) {
      lastLive = text;
      logs.live.push({ t: performance.now(), text });
    }
    const transcript = kmTranscriptEl();
    const busy = transcript === null ? undefined : transcript.getAttribute("aria-busy");
    if (busy !== undefined && busy !== lastBusy) {
      lastBusy = busy;
      logs.busy.push({ t: performance.now(), value: busy, runStatus: kmRunStatus() });
    }
  };
  const start = (): void => {
    new MutationObserver(observe).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-busy"] });
  };
  if (document.documentElement === null) document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  document.addEventListener("focusin", (e) => logs.focus.push({ t: performance.now(), el: kmDescribe(e.target instanceof Element ? e.target : null) }), true);
  document.addEventListener("click", (e) => logs.clicks.push({ t: performance.now(), trusted: e.isTrusted, target: kmDescribe(e.target instanceof Element ? e.target : null) }), true);
}

function kmInstallCommands(config: A11yAgentConfig, w: WebviewInstrumentation, logs: KmA11yLogs, startedAtEpochMs: number): void {
  const post = (event: string, detail: unknown): void => {
    kmA11yPost(config, event, detail).catch((e: unknown) => logs.errors.push(String(e)));
  };
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const command = e.key === "F16" || e.key === "F17" || e.key === "F18" || e.key === "F19";
    if (!command) logs.keys.push({ t: performance.now(), key: e.key, trusted: e.isTrusted, alt: e.altKey, shift: e.shiftKey, target: kmDescribe(e.target instanceof Element ? e.target : null) });
    if (!command || !e.isTrusted) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "F19") setTimeout(() => post("a11y-state", kmState(logs, "F19")), 0);
    if (e.key === "F18") {
      const label = `F18 ${kmRunStatus() ?? "?"}${kmApprovals().some((a) => a.status === "pending") ? " approval-pending" : ""}`;
      kmRunAxe(logs, label).then(() => post("a11y-state", kmState(logs, "F18"))).catch((err: unknown) => logs.errors.push(`axe: ${String(err)}`));
    }
    if (e.key === "F17") post("a11y-final", kmFinal(config, w, logs));
    if (e.key === "F16" && config.judge) {
      kmJudge(config, w, kmFinal(config, w, logs), startedAtEpochMs)
        .then(() => post("a11y-judged", { t: performance.now() }))
        .catch((err: unknown) => logs.errors.push(`judge: ${String(err)}`));
    }
  }, true);
}

function kmStartWatcher(config: A11yAgentConfig, logs: KmA11yLogs): void {
  const post = (event: string, detail: unknown): void => {
    kmA11yPost(config, event, detail).catch((e: unknown) => logs.errors.push(String(e)));
  };
  const tick = (): void => {
    let status: RunStatus | null = null;
    let longest = 0;
    let snapshot: ReturnType<NonNullable<Window["__spike"]>["snapshot"]> | null = null;
    try {
      snapshot = window.__spike?.snapshot() ?? null;
    } catch {
      snapshot = null;
    }
    if (snapshot !== null) {
      status = snapshot.runStatus;
      for (const m of snapshot.messages) if (m.role === "assistant") longest = Math.max(longest, m.text.length);
    }
    const now = performance.now();
    if (longest > 0 && logs.firstTextAt === null) logs.firstTextAt = now;
    if (longest >= 200 && logs.sample200 === null) {
      logs.sample200 = { t: now, ariaBusy: kmTranscriptEl()?.getAttribute("aria-busy") ?? null, streamingMessage: document.querySelector('[data-testid="km-message"][data-status="streaming"]') !== null, liveAncestors: kmLiveAncestors() };
    }
    if (config.kind === "stream" && longest >= 2000 && !logs.midStreamAxe && status === "running") {
      logs.midStreamAxe = true;
      kmRunAxe(logs, "auto mid-stream").catch((e: unknown) => logs.errors.push(`axe mid-stream: ${String(e)}`));
    }
    if (status !== null && status !== logs.lastStatus) {
      logs.lastStatus = status;
      logs.statuses.push({ t: now, status });
      if (KM_SETTLED_STATUSES.includes(status)) post("a11y-settled", kmState(logs, `settled ${status}`));
    }
    for (const a of kmApprovals()) {
      if (a.status === "pending" && !logs.pendingPosted.has(a.interruptId)) {
        logs.pendingPosted.add(a.interruptId);
        post("a11y-approval", kmState(logs, `approval ${a.interruptId} pending`));
      }
    }
  };
  setInterval(tick, 50);
}

export async function kmA11yAgent(config: A11yAgentConfig): Promise<void> {
  if (window.top !== window) return;
  const params = new URLSearchParams(location.search);
  if (params.get("kmA11y") === null) {
    const app = new URL(config.appUrl);
    const url = new URL(location.protocol === app.protocol && location.host === app.host ? `${location.protocol}//${location.host}${location.pathname}` : config.appUrl);
    url.search = "";
    url.searchParams.set("scenario", config.scenarioId);
    url.searchParams.set("agui", config.harnessUrl);
    url.searchParams.set("session", config.sessionId);
    url.searchParams.set("allowMediaOrigin", new URL(config.harnessUrl).origin);
    url.searchParams.set("kmA11y", "1");
    location.replace(url.toString());
    return;
  }
  const startedAtEpochMs = Date.now();
  const w = kmInstallInstrumentation();
  const logs: KmA11yLogs = {
    live: [], busy: [], focus: [], keys: [], clicks: [], axe: [], statuses: [], errors: [],
    firstTextAt: null, sample200: null, midStreamAxe: false, seq: 0, lastStatus: null, pendingPosted: new Set(), scenario: null, surface: null,
  };
  kmInstallLogs(logs);
  kmInstallCommands(config, w, logs, startedAtEpochMs);
  if (document.readyState === "loading") await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  try {
    const scenarioRes = await fetch(`${config.harnessUrl}/scenarios/${encodeURI(config.scenarioId)}`);
    logs.scenario = ((await scenarioRes.json()) as { scenario: ScenarioFile }).scenario;
    if (config.surfaceId !== null) logs.surface = (await (await fetch(`${config.harnessUrl}/a2ui/surfaces/${encodeURIComponent(config.surfaceId)}`)).json()) as GoldenSurfaceFile;
    await kmPoll("__spike.ready", () => (window.__spike?.ready === true ? true : null), 30_000);
  } catch (e: unknown) {
    logs.errors.push(`setup: ${String(e)}`);
  }
  kmStartWatcher(config, logs);
  await kmA11yPost(config, "a11y-ready", { ...kmState(logs, "ready"), prompt: logs.scenario?.userPrompt ?? "" });
}
