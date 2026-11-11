/**
 * Gate 16.4: the checks of checks/a11y.spec.ts (8 tests) and
 * checks/a2ui-surfaces.spec.ts (8 golden surfaces), re-expressed for the Tauri
 * WKWebView with trusted OS input (A11ySession). Each procedure launches the app
 * once and returns one or more outcomes with the evidence it observed.
 */
import type { GoldenSurfaceFile } from "../../domain/a2ui-surface.ts";
import { deepEqual, short } from "../../../checks/support/deep-equal.ts";
import type { A11yFinal, AxeRecord, ElementDesc } from "./a11y-types.ts";
import { A11ySession, HARNESS, KEY, OUTSIDE_WEBVIEW, describe, sleep, type TraceStep } from "./a11y-session.ts";

export interface CheckOutcome {
  readonly id: string;
  readonly prototype: string;
  readonly pass: boolean;
  readonly details: readonly string[];
  readonly runId: string;
  readonly traces: Readonly<Record<string, readonly string[]>>;
  readonly axe: readonly AxeRecord[];
  readonly warnings: readonly string[];
}

const SETTLED = new Set(["finished", "interrupted", "cancelled", "error"]);
const MAX_ANNOUNCEMENT_CHARS = 300;
const ANNOUNCEMENT_SLACK = 3;

function outcome(s: A11ySession, id: string, problems: readonly string[], notes: readonly string[], extra: { traces?: Record<string, readonly string[]>; axe?: readonly AxeRecord[] } = {}): CheckOutcome {
  return {
    id, prototype: s.config.prototype, pass: problems.length === 0, details: [...problems.map((p) => `FAIL ${p}`), ...notes], runId: s.config.runId,
    traces: extra.traces ?? {}, axe: extra.axe ?? [], warnings: [...s.warnings],
  };
}

/** The collector's Playwright comparison for the scenario (reported separately from the a11y check). */
function conformance(s: A11ySession, problems: readonly string[]): CheckOutcome {
  const notes = s.typed === (s.ready?.prompt ?? "") ? [] : [`typed prompt arrived as ${JSON.stringify(s.typed)} (expected ${JSON.stringify(s.ready?.prompt ?? "")})`];
  return outcome(s, `conformance ${s.config.scenarioId} (collector compare.ts)`, problems, notes);
}

function axeProblems(axe: readonly AxeRecord[], labels: readonly string[]): string[] {
  const problems: string[] = [];
  for (const label of labels) {
    const run = axe.find((a) => a.label.includes(label));
    if (run === undefined) problems.push(`axe ${label}: not run`);
    else if (run.violations.length > 0) problems.push(`axe ${label}: ${run.violations.join("; ")}`);
  }
  return problems;
}

function firstSettleAt(final: A11yFinal): number | null {
  return final.statuses.find((x) => SETTLED.has(x.status))?.t ?? null;
}

function traceLines(trace: readonly TraceStep[]): string[] {
  return trace.map((t, i) => `${i + 1}. ${t.press} -> ${describe(t.active)}`);
}

/** aria-busy and live-region transitions the agent logged (MutationObserver), as evidence notes. */
function transitions(final: A11yFinal): string[] {
  const busy = final.busy.map((b) => `${Math.round(b.t)}ms=${String(b.value)}(${String(b.runStatus)})`).join(", ");
  const live = final.live.map((r) => `${Math.round(r.t)}ms:${JSON.stringify(r.text.slice(0, 60))}`).join(" | ");
  return [`aria-busy transitions: ${busy || "none"}`, `live-region (${final.liveRegion.count} region, aria-live=${String(final.liveRegion.ariaLive)} role=${String(final.liveRegion.role)}) changes: ${live || "none"}`];
}

/** A2UI ids of a trace, first occurrence order. */
function a2uiOrder(trace: readonly TraceStep[]): string[] {
  const seen: string[] = [];
  for (const t of trace) if (t.active.a2uiId !== null && !seen.includes(t.active.a2uiId)) seen.push(t.active.a2uiId);
  return seen;
}

function sameEl(a: ElementDesc, b: ElementDesc): boolean {
  return a.tag === b.tag && a.testid === b.testid && a.a2uiId === b.a2uiId && a.name === b.name;
}

/** long-markdown: a11y.spec.ts tests 1-4 from one launch (axe idle/mid/settled, aria-busy, not-live, live throttling). */
export async function streamChecks(s: A11ySession): Promise<CheckOutcome[]> {
  await s.launch();
  await s.axe();
  await s.submitPrompt(s.ready?.prompt ?? "");
  await s.waitSettled(240_000);
  await sleep(2_000);
  await s.axe();
  const final = await s.final();
  const judged = await s.judge();
  const axe = final.axe;
  const out: CheckOutcome[] = [];
  const labels = axe.map((a) => a.label);
  const axeP = axeProblems(axe, ["idle", "mid-stream", "finished"]);
  out.push(outcome(s, "a11y-1 axe idle / mid-stream / settled", axeP, [`axe runs: ${labels.join(", ")}`], { axe }));

  const busyP: string[] = [];
  if (final.sample200?.ariaBusy !== "true") busyP.push(`aria-busy at 200 chars = ${String(final.sample200?.ariaBusy)}`);
  if (final.transcriptBusy === "true") busyP.push("aria-busy still true after settle");
  out.push(outcome(s, "a11y-2 transcript aria-busy while streaming and not after", busyP, [`aria-busy transitions: ${final.busy.map((b) => `${Math.round(b.t)}ms=${String(b.value)}(${String(b.runStatus)})`).join(", ")}`]));

  const liveP: string[] = [];
  if (final.sample200 === null) liveP.push("no 200-char sample");
  else if (!final.sample200.streamingMessage) liveP.push("no streaming message at 200 chars");
  else if (final.sample200.liveAncestors.length > 0) liveP.push(`live ancestors: ${final.sample200.liveAncestors.join(", ")}`);
  out.push(outcome(s, "a11y-3 streaming text not inside a live region", liveP, []));

  const start = final.firstTextAt;
  const end = firstSettleAt(final);
  const throttleP: string[] = [];
  const notes: string[] = [];
  const lr = final.liveRegion;
  if (lr.count !== 1) throttleP.push(`live regions: ${lr.count}`);
  if (!(lr.ariaLive === "polite" || lr.ariaLive === "assertive" || lr.role === "status" || lr.role === "log")) throttleP.push(`live semantics aria-live=${String(lr.ariaLive)} role=${String(lr.role)}`);
  if (start === null || end === null) throttleP.push("stream start/end not observed");
  else {
    const said = final.live.filter((r) => r.text !== "");
    const during = said.filter((a) => a.t >= start && a.t < end);
    const seconds = (end - start) / 1000;
    const budget = Math.ceil(seconds) + ANNOUNCEMENT_SLACK;
    if (during.length > budget) throttleP.push(`${during.length} announcements in ${seconds.toFixed(1)} s (budget ${budget})`);
    const last = final.live.at(-1);
    if (last === undefined || last.t < end - 250) throttleP.push("no finalized announcement after completion");
    const fin = said.at(-1)?.text ?? "";
    if (fin === "") throttleP.push("final announcement empty");
    if (fin.length > MAX_ANNOUNCEMENT_CHARS) throttleP.push(`final announcement ${fin.length} chars`);
    notes.push(`${during.length} announcements during ${seconds.toFixed(1)} s (budget ${budget}); final (${fin.length} chars): ${JSON.stringify(fin.slice(0, 120))}`);
  }
  out.push(outcome(s, "a11y-4 live-region announcements throttled and finalized", throttleP, notes));
  out.push(conformance(s, judged));
  return out;
}

/** hitl-approve: focus is not stolen by streaming or a new approval card; axe with a pending approval. */
export async function focusCheck(s: A11ySession): Promise<CheckOutcome[]> {
  await s.launch();
  await s.submitPrompt(s.ready?.prompt ?? "");
  // Put focus in the composer right after submit without a pointer click: the layout moves
  // while the approval card arrives, so a click could land on the card instead.
  const notes: string[] = [];
  const afterSubmit = (await s.state()).active;
  notes.push(`focus right after submit: ${describe(afterSubmit)}`);
  if (afterSubmit.testid === "km-composer-submit") s.key(KEY.tab, "shift");
  else if (afterSubmit.testid !== "km-composer-input") s.click(await s.target("km-composer-input"), "composer");
  const focused = await s.state();
  if (focused.active.testid !== "km-composer-input") notes.push(`could not place focus in the composer: ${describe(focused.active)}`);
  await s.waitSettled(60_000);
  await s.waitEvent("a11y-approval", () => true, 10_000);
  await sleep(500);
  const st = await s.axe();
  const final = await s.final();
  const focusedAt = focused.t;
  notes.push(`focus placed at ${Math.round(focusedAt)} ms; first settle at ${Math.round(firstSettleAt(final) ?? -1)} ms`);
  const moves = final.focus.filter((f) => f.t > focusedAt + 1 && f.el.testid !== "km-composer-input");
  const p: string[] = [];
  if (st.active.testid !== "km-composer-input") p.push(`active after settle: ${describe(st.active)}`);
  if (moves.length > 0) p.push(`focus moves: ${moves.map((m) => describe(m.el)).join(", ")}`);
  p.push(...axeProblems(final.axe, ["approval-pending"]));
  return [outcome(s, "a11y-5 streaming and approval never steal focus (+ axe with pending approval)", p, [...notes, `active after settle: ${describe(st.active)}`, ...transitions(final)], { axe: final.axe })];
}

/** hitl-approve / hitl-reject: Tab from the composer to the decision button, then Enter / Space. */
export async function decisionCheck(s: A11ySession, decision: "approve" | "reject"): Promise<CheckOutcome[]> {
  const interruptId = decision === "approve" ? "int-email-approve" : "int-email-reject";
  const testid = decision === "approve" ? "km-approval-approve" : "km-approval-reject";
  await s.launch();
  await s.submitPrompt(s.ready?.prompt ?? "");
  await s.waitSettled(60_000);
  await s.waitEvent("a11y-approval", () => true, 10_000);
  const pending = await s.axe();
  const p: string[] = [];
  const card = pending.approvals.find((a) => a.interruptId === interruptId);
  if (card === undefined) p.push(`no card ${interruptId}`);
  else {
    if (!/approve/i.test(card.approveName)) p.push(`approve name ${JSON.stringify(card.approveName)}`);
    if (!/reject|deny|decline/i.test(card.rejectName)) p.push(`reject name ${JSON.stringify(card.rejectName)}`);
  }
  s.click(await s.target("km-composer-input"), "composer");
  await sleep(200);
  const traces: Record<string, string[]> = {};
  const tab = await s.tabUntil("", 15, (a) => a.testid === testid || a === OUTSIDE_WEBVIEW);
  traces["Tab from composer"] = traceLines(tab);
  const notes: string[] = [];
  let reached = tab.at(-1)?.active.testid === testid;
  if (!reached) {
    // Browser expectation is plain Tab. Option+Tab (WebKit's inverse of the tab-to-all-controls setting) is diagnostic only.
    p.push(`${testid} not reached with plain Tab in ${tab.length} presses`);
    s.click(await s.target("km-composer-input"), "composer");
    const alt = await s.tabUntil("opt", 15, (a) => a.testid === testid || a === OUTSIDE_WEBVIEW);
    traces["Option+Tab from composer (fallback)"] = traceLines(alt);
    reached = alt.at(-1)?.active.testid === testid;
  }
  const before = (await s.sessionSummary())?.requestCount ?? 0;
  if (reached) s.key(decision === "approve" ? KEY.enter : KEY.space);
  const after = reached ? await s.waitRequestsAbove(before) : before;
  if (after <= before) p.push(`no new request after ${decision === "approve" ? "Enter" : "Space"} (requests ${before} -> ${after})`);
  if (reached) await s.waitSettleCount(2, 30_000).catch(() => p.push("no second settle"));
  await sleep(400);
  const st = await s.state();
  const status = st.approvals.find((a) => a.interruptId === interruptId)?.status;
  const want = decision === "approve" ? "approved" : "rejected";
  if (status !== want) p.push(`card status ${String(status)} (want ${want})`);
  if (st.active.tag === "body" || st.active.tag === "none") p.push(`focus dropped to ${st.active.tag} after the decision`);
  const final = await s.final();
  const judged = await s.judge();
  const key = final.keys.filter((k) => k.key === "Enter" || k.key === " ").at(-1);
  return [outcome(s, `a11y-${decision === "approve" ? 6 : 7} approval can be ${decision}d from the keyboard`, p, [
    ...notes,
    ...transitions(final),
    `decision key: ${key === undefined ? "none" : `${JSON.stringify(key.key)} trusted=${key.trusted} on ${describe(key.target)}`}`,
    `focus after decision: ${describe(st.active)}`,
    `reference DOM order (tabindex>=0): ${pending.focusables.map(describe).join(" | ")}`,
  ], { traces, axe: final.axe }), conformance(s, judged)];
}

/** run-error: role=alert inside the transcript, visible with text. */
export async function alertCheck(s: A11ySession): Promise<CheckOutcome[]> {
  await s.launch();
  await s.submitPrompt(s.ready?.prompt ?? "");
  await s.waitSettled(60_000);
  await sleep(300);
  await s.axe();
  const final = await s.final();
  const judged = await s.judge();
  const p: string[] = [];
  if (final.alert.count < 1) p.push("no role=alert in the transcript");
  else if (!final.alert.visible) p.push("alert not visible");
  else if (final.alert.text.trim() === "") p.push("alert has no text");
  return [outcome(s, "a11y-8 run errors use role=alert", p, [`alert: ${JSON.stringify(final.alert)}`, ...transitions(final)], { axe: final.axe }), conformance(s, judged)];
}

async function actions(s: A11ySession): Promise<{ name: string; surfaceId: string; sourceComponentId?: string; context: unknown }[]> {
  return (await s.sessionSummary())?.a2uiActions ?? [];
}

async function fillField(s: A11ySession, componentId: string, value: string): Promise<void> {
  s.click(await s.target(`field:${componentId}`), `field ${componentId}`);
  await sleep(120);
  s.key(KEY.a, "cmd");
  s.type(value);
  await sleep(150);
}

/** One golden surface: conformance at first settle, visible text, data model, blocked media, Tab trace, interactions. */
export async function surfaceCheck(s: A11ySession, surface: GoldenSurfaceFile): Promise<CheckOutcome[]> {
  const started = Date.now();
  await s.launch();
  await s.submitPrompt(s.ready?.prompt ?? "");
  await s.waitSettled(60_000);
  await sleep(600);
  const p: string[] = [];
  const notes: string[] = [];
  p.push(...(await s.judge()).map((j) => `conformance: ${j}`));
  const st = await s.axe();
  for (const [text, shown] of Object.entries(st.visibleText)) if (surface.expected.visibleText.includes(text) && !shown) p.push(`visible text missing: ${text}`);
  if (surface.expected.dataModel !== undefined) {
    const model = st.a2uiSurfaces.find((x) => x.surfaceId === surface.surfaceId)?.dataModel;
    if (!deepEqual(model, surface.expected.dataModel)) p.push(`dataModel: expected ${short(surface.expected.dataModel)}, got ${short(model)}`);
  }
  const traces: Record<string, string[]> = {};
  const start = st.targets["km-composer-input"];
  if (start !== undefined) {
    s.click(start, "composer");
    await sleep(150);
    const composer = (await s.state()).active;
    const expected = [...new Set(st.focusables.map((f) => f.a2uiId).filter((x): x is string => x !== null))];
    const stop = (a: ElementDesc, i: number): boolean => (i > 0 && sameEl(a, composer)) || a === OUTSIDE_WEBVIEW;
    const tab = await s.tabUntil("", 30, stop);
    traces["Tab cycle from composer"] = traceLines(tab);
    s.click(start, "composer");
    await sleep(150);
    const alt = await s.tabUntil("opt", 40, stop);
    // WebKit inverts the tab-to-all-controls setting with Option: recorded as a diagnostic, not judged.
    traces["Option+Tab cycle from composer (diagnostic)"] = traceLines(alt);
    const order = a2uiOrder(tab);
    const missing = expected.filter((id) => !order.includes(id));
    const ordered = expected.filter((id) => order.includes(id)).join(",") === order.filter((id) => expected.includes(id)).join(",");
    notes.push(`browser expectation (DOM tab order, tabindex>=0): ${expected.join(", ") || "none"}`);
    notes.push(`plain Tab reached: ${order.join(", ") || "none"}; Option+Tab reached: ${a2uiOrder(alt).join(", ") || "none"}`);
    if (missing.length > 0) p.push(`A2UI controls not reached by Tab: ${missing.join(", ")}`);
    if (!ordered) p.push("Tab order differs from DOM order");
  }
  let settles = s.states("a11y-settled").length;
  for (const interaction of surface.interactions) {
    const before = (await actions(s)).length;
    for (const [id, value] of Object.entries(interaction.fill ?? {})) await fillField(s, id, value);
    for (const id of interaction.toggle ?? []) {
      s.click(await s.target(`checkbox:${id}`), `checkbox ${id}`);
      await sleep(150);
    }
    const t = (await s.state()).targets;
    const button = t[`button:${interaction.click}`] ?? t[`a2ui:${interaction.click}`];
    if (button === undefined) {
      p.push(`"${interaction.description}": ${interaction.click} not on the page`);
      continue;
    }
    s.click(button, `click ${interaction.click}`);
    const wanted = interaction.expectAction;
    if (wanted === undefined) {
      await sleep(1_500);
      const now = (await actions(s)).length;
      if (now !== before) p.push(`"${interaction.description}" sent an action (must not)`);
    } else {
      const deadline = Date.now() + 10_000;
      let list = await actions(s);
      while (list.length <= before && Date.now() < deadline) {
        await sleep(100);
        list = await actions(s);
      }
      const sent = list[before];
      if (sent === undefined) p.push(`"${interaction.description}": no action ${wanted.name}`);
      else {
        if (sent.name !== wanted.name) p.push(`"${interaction.description}": action ${sent.name} (want ${wanted.name})`);
        if (sent.surfaceId !== surface.surfaceId) p.push(`"${interaction.description}": surfaceId ${sent.surfaceId}`);
        if (sent.sourceComponentId !== undefined && sent.sourceComponentId !== wanted.sourceComponentId) p.push(`"${interaction.description}": source ${sent.sourceComponentId}`);
        if (!deepEqual(sent.context, wanted.context)) p.push(`"${interaction.description}": context expected ${short(wanted.context)}, got ${short(sent.context)}`);
        notes.push(`"${interaction.description}" -> ${sent.name} ${short(sent.context)}`);
      }
      settles += 1;
      await s.waitSettleCount(settles, 30_000).catch(() => p.push(`"${interaction.description}": no settle after the action`));
    }
    const after = await s.state();
    for (const text of interaction.expectVisibleText ?? []) if (after.visibleText[text] !== true) p.push(`"${interaction.description}": text not visible: ${text}`);
  }
  const final = await s.final();
  const blocked = final.resources.filter((r) => surface.expected.blockedMediaUrls.includes(r));
  if (blocked.length > 0) p.push(`blocked media requested: ${blocked.join(", ")}`);
  const hits = (await (await fetch(`${HARNESS}/hits?since=${started}`)).json()) as { evil: { path: string }[] };
  if (surface.expected.blockedMediaUrls.length > 0 && hits.evil.length > 0) p.push(`evil-origin hits: ${hits.evil.map((h) => h.path).join(", ")}`);
  const clicks = final.clicks.filter((c) => !c.trusted).length;
  if (clicks > 0) p.push(`${clicks} untrusted click(s) seen`);
  return [outcome(s, `a2ui/${surface.id}`, p, [...notes, ...transitions(final)], { traces, axe: final.axe })];
}

/** form-validation, keyboard only: Tab into the fields, type, Space on the checkbox, Enter on submit. */
export async function keyboardFormCheck(s: A11ySession, surface: GoldenSurfaceFile): Promise<CheckOutcome[]> {
  const golden = surface.interactions.find((i) => i.expectAction !== undefined && i.fill !== undefined);
  if (golden?.expectAction === undefined) throw new Error("form surface has no submitting interaction");
  await s.launch();
  await s.submitPrompt(s.ready?.prompt ?? "");
  await s.waitSettled(60_000);
  await sleep(500);
  s.click(await s.target("km-composer-input"), "composer");
  await sleep(150);
  const p: string[] = [];
  const trace: TraceStep[] = [];
  const plainMisses: string[] = [];
  const goTo = async (id: string, tag: string | null): Promise<boolean> => {
    const hit = (a: ElementDesc): boolean => a.a2uiId === id && (tag === null || a.tag === tag);
    const steps = await s.tabUntil("", 12, (a) => hit(a) || a === OUTSIDE_WEBVIEW);
    trace.push(...steps);
    if (steps.at(-1)?.active.a2uiId === id) return true;
    plainMisses.push(id);
    const alt = await s.tabUntil("opt", 20, (a) => hit(a) || a === OUTSIDE_WEBVIEW);
    trace.push(...alt);
    return alt.at(-1)?.active.a2uiId === id;
  };
  for (const [id, value] of Object.entries(golden.fill ?? {})) {
    if (!(await goTo(id, null))) p.push(`field ${id} not reached by Tab or Option+Tab`);
    else s.type(value);
  }
  for (const id of golden.toggle ?? []) {
    if (!(await goTo(id, null))) p.push(`checkbox ${id} not reached by Tab or Option+Tab`);
    else s.key(KEY.space);
  }
  const before = (await actions(s)).length;
  if (!(await goTo(golden.click, null))) p.push(`button ${golden.click} not reached by Tab or Option+Tab`);
  else s.key(KEY.enter);
  const deadline = Date.now() + 10_000;
  let list = await actions(s);
  while (list.length <= before && Date.now() < deadline) {
    await sleep(100);
    list = await actions(s);
  }
  const sent = list[before];
  if (sent === undefined) p.push(`no ${golden.expectAction.name} action after Enter`);
  else if (sent.name !== golden.expectAction.name || !deepEqual(sent.context, golden.expectAction.context)) p.push(`sent ${sent.name} ${short(sent.context)}`);
  const final = await s.final();
  if (plainMisses.length > 0) p.push(`not reachable with plain Tab (Option+Tab used): ${plainMisses.join(", ")}`);
  return [outcome(s, `a2ui/${surface.id} keyboard-only submit`, p, [`keys: ${final.keys.filter((k) => k.key === "Tab" || k.key === "Enter" || k.key === " ").length} trusted=${final.keys.every((k) => k.trusted)}`, sent === undefined ? "" : `sent ${sent.name} ${short(sent.context)}`], { traces: { "keyboard-only form": traceLines(trace) } })];
}

