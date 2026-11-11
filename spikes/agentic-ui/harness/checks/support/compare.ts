/**
 * Compares `window.__spike.snapshot()` and the server session summary with a
 * scenario's ExpectedOutcome. Returns human-readable mismatches (empty = pass).
 * DOM and forbiddenText assertions need the page and live in conformance.ts.
 *
 * Message rule: only user/assistant/reasoning messages are compared. Tool,
 * activity, system and developer messages are covered by their own fields.
 * An assistant message with empty text whose id the expectation does not name
 * (a tool-call carrier some runtimes create) is ignored; any other extra fails.
 */
import type { ExpectedMessage, ExpectedOutcome, ExpectedServerLog } from "../../src/domain/expected.ts";
import type { SnapshotMessage, SpikeSnapshot } from "../../src/domain/spike-probe.ts";
import type { SessionSummary } from "../../src/server/session-log.ts";
import { deepEqual, sameSet, short } from "./deep-equal.ts";

const COMPARED_ROLES = new Set(["user", "assistant", "reasoning"]);

function messageProblems(expected: readonly ExpectedMessage[], actual: readonly SnapshotMessage[]): string[] {
  const named = new Set(expected.flatMap((m) => (m.id === undefined ? [] : [m.id])));
  const compared = actual.filter((m) => COMPARED_ROLES.has(m.role) && !(m.role === "assistant" && m.text === "" && !named.has(m.id)));
  const problems: string[] = [];
  if (compared.length !== expected.length) {
    problems.push(`messages: expected ${expected.length}, got ${compared.length} [${compared.map((m) => `${m.role}:${m.id}:${m.status}`).join(", ")}]`);
  }
  expected.forEach((exp, i) => {
    const act = compared[i];
    const at = `messages[${i}]`;
    if (act === undefined) return;
    if (exp.id !== undefined && act.id !== exp.id) problems.push(`${at}.id: expected ${exp.id}, got ${act.id}`);
    if (act.role !== exp.role) problems.push(`${at}.role: expected ${exp.role}, got ${act.role}`);
    if (exp.status !== undefined && act.status !== exp.status) problems.push(`${at}.status: expected ${exp.status}, got ${act.status}`);
    if (exp.textEquals !== undefined && act.text !== exp.textEquals) {
      problems.push(`${at}.text: expected ${short(exp.textEquals)}, got ${short(act.text)}`);
    }
    for (const part of exp.textIncludes ?? []) {
      if (!act.text.includes(part)) problems.push(`${at}.text: missing ${short(part)}`);
    }
    const full = exp.textIsStrictPrefixOf;
    if (full !== undefined && !(act.text.length > 0 && act.text.length < full.length && full.startsWith(act.text))) {
      problems.push(`${at}.text: expected a non-empty strict prefix of the full text (${full.length} chars), got ${act.text.length} chars`);
    }
  });
  return problems;
}

function toolCallProblems(expected: NonNullable<ExpectedOutcome["toolCalls"]>, snapshot: SpikeSnapshot): string[] {
  const problems: string[] = [];
  const actualIds = snapshot.toolCalls.map((t) => t.id);
  const extra = actualIds.filter((id) => !expected.some((e) => e.id === id));
  if (extra.length > 0) problems.push(`toolCalls: unexpected ${extra.join(", ")}`);
  for (const exp of expected) {
    const act = snapshot.toolCalls.find((t) => t.id === exp.id);
    if (act === undefined) {
      problems.push(`toolCalls: missing ${exp.id}`);
      continue;
    }
    if (act.name !== exp.name) problems.push(`toolCalls.${exp.id}.name: expected ${exp.name}, got ${act.name}`);
    if (act.status !== exp.status) problems.push(`toolCalls.${exp.id}.status: expected ${exp.status}, got ${act.status}`);
    if (exp.args !== undefined && !deepEqual(act.args, exp.args)) problems.push(`toolCalls.${exp.id}.args: expected ${short(exp.args)}, got ${short(act.args)}`);
    if (exp.resultIncludes !== undefined) {
      const result = typeof act.result === "string" ? act.result : JSON.stringify(act.result ?? null);
      if (!result.includes(exp.resultIncludes)) problems.push(`toolCalls.${exp.id}.result: missing ${short(exp.resultIncludes)} in ${short(result)}`);
    }
  }
  return problems;
}

function customPartProblems(expected: NonNullable<ExpectedOutcome["customParts"]>, snapshot: SpikeSnapshot): string[] {
  const remaining = [...snapshot.customParts];
  const problems: string[] = [];
  for (const exp of expected) {
    const index = remaining.findIndex((p) => p.name === exp.name && p.rendering === exp.rendering && (exp.partId === undefined || p.partId === exp.partId));
    if (index === -1) problems.push(`customParts: missing ${exp.name}${exp.partId === undefined ? "" : `#${exp.partId}`} rendered as ${exp.rendering}`);
    else remaining.splice(index, 1);
  }
  for (const extra of remaining) problems.push(`customParts: unexpected ${extra.name}${extra.partId === undefined ? "" : `#${extra.partId}`} (${extra.rendering})`);
  return problems;
}

function surfaceProblems(expected: NonNullable<ExpectedOutcome["a2uiSurfaces"]>, snapshot: SpikeSnapshot): string[] {
  const problems: string[] = [];
  for (const exp of expected) {
    const act = snapshot.a2uiSurfaces.find((s) => s.surfaceId === exp.surfaceId);
    const at = `a2uiSurfaces.${exp.surfaceId}`;
    if (act === undefined) {
      problems.push(`${at}: missing`);
      continue;
    }
    if (exp.deleted !== undefined && act.deleted !== exp.deleted) problems.push(`${at}.deleted: expected ${exp.deleted}, got ${act.deleted}`);
    if (exp.deleted !== true && !sameSet(act.renderedComponentIds, exp.renderedComponentIds)) {
      problems.push(`${at}.renderedComponentIds: expected ${short([...exp.renderedComponentIds].sort())}, got ${short([...act.renderedComponentIds].sort())}`);
    }
    if (exp.fallbackComponentIds !== undefined && !sameSet(act.fallbackComponentIds, exp.fallbackComponentIds)) {
      problems.push(`${at}.fallbackComponentIds: expected ${short(exp.fallbackComponentIds)}, got ${short(act.fallbackComponentIds)}`);
    }
    if (exp.dataModel !== undefined && !deepEqual(act.dataModel, exp.dataModel)) problems.push(`${at}.dataModel: expected ${short(exp.dataModel)}, got ${short(act.dataModel)}`);
  }
  return problems;
}

function lifecycleProblems(expected: ExpectedOutcome, snapshot: SpikeSnapshot): string[] {
  const problems: string[] = [];
  for (const exp of expected.interrupts ?? []) {
    const act = snapshot.interrupts.find((i) => i.id === exp.id);
    if (act?.status !== exp.status) problems.push(`interrupts.${exp.id}: expected ${exp.status}, got ${act?.status ?? "missing"}`);
  }
  for (const exp of expected.steps ?? []) {
    const act = snapshot.steps.find((s) => s.name === exp.name);
    if (act?.status !== exp.status) problems.push(`steps.${exp.name}: expected ${exp.status}, got ${act?.status ?? "missing"}`);
  }
  for (const exp of expected.subagents ?? []) {
    const act = snapshot.subagents.find((s) => s.subagentRunId === exp.subagentRunId);
    if (act?.status !== exp.status) problems.push(`subagents.${exp.subagentRunId}: expected ${exp.status}, got ${act?.status ?? "missing"}`);
  }
  return problems;
}

export function compareSnapshot(expected: ExpectedOutcome, snapshot: SpikeSnapshot): string[] {
  const problems: string[] = [];
  if (snapshot.runStatus !== expected.runStatus) problems.push(`runStatus: expected ${expected.runStatus}, got ${snapshot.runStatus}`);
  if (expected.runErrorCode !== undefined && snapshot.runErrorCode !== expected.runErrorCode) {
    problems.push(`runErrorCode: expected ${expected.runErrorCode}, got ${snapshot.runErrorCode ?? "none"}`);
  }
  if (expected.messages !== undefined) problems.push(...messageProblems(expected.messages, snapshot.messages));
  if (expected.toolCalls !== undefined) problems.push(...toolCallProblems(expected.toolCalls, snapshot));
  problems.push(...lifecycleProblems(expected, snapshot));
  if (expected.state !== undefined && !deepEqual(snapshot.state, expected.state)) problems.push(`state: expected ${short(expected.state)}, got ${short(snapshot.state)}`);
  if (expected.customParts !== undefined) problems.push(...customPartProblems(expected.customParts, snapshot));
  if (expected.a2uiSurfaces !== undefined) problems.push(...surfaceProblems(expected.a2uiSurfaces, snapshot));
  const errors = snapshot.protocolErrors.length;
  if (expected.minProtocolErrors !== undefined && errors < expected.minProtocolErrors) {
    problems.push(`protocolErrors: expected at least ${expected.minProtocolErrors}, got ${errors}`);
  }
  if ((expected.noProtocolErrors ?? expected.minProtocolErrors === undefined) && errors > 0) {
    problems.push(`protocolErrors: expected none, got ${short(snapshot.protocolErrors)}`);
  }
  return problems;
}

export function compareServer(expected: ExpectedServerLog | undefined, summary: SessionSummary): string[] {
  const problems: string[] = [];
  if (summary.unmatchedRequests > 0) problems.push(`server: ${summary.unmatchedRequests} request(s) matched no run (see GET /sessions/<id>)`);
  if (summary.invalidInputs > 0) problems.push(`server: ${summary.invalidInputs} request(s) failed RunAgentInputSchema`);
  if (expected === undefined) return problems;
  if (expected.requestCount !== undefined && summary.requestCount !== expected.requestCount) {
    problems.push(`server.requestCount: expected ${expected.requestCount}, got ${summary.requestCount}`);
  }
  if (expected.resumeEntries !== undefined && !deepEqual(summary.resumeEntries, expected.resumeEntries)) {
    problems.push(`server.resumeEntries: expected ${short(expected.resumeEntries)}, got ${short(summary.resumeEntries)}`);
  }
  if (expected.noResolvedResumeAfterExpiry === true && !summary.noResolvedResumeAfterExpiry) problems.push("server: a resolved resume arrived after the interrupt expired");
  if (expected.resumedWithLastEventId === true && !summary.resumedWithLastEventId) problems.push("server: no reconnect carried Last-Event-ID at the dropped position");
  if (expected.clientAborted === true && !summary.clientAborted) problems.push("server: the client never aborted the stream");
  if (expected.a2uiActions !== undefined) {
    const actual = summary.a2uiActions.map((a) => ({ name: a.name, surfaceId: a.surfaceId, ...(a.context === undefined ? {} : { context: a.context }) }));
    const wanted = expected.a2uiActions.map((a) => ({ name: a.name, surfaceId: a.surfaceId, ...(a.context === undefined ? {} : { context: a.context }) }));
    if (!deepEqual(actual, wanted)) problems.push(`server.a2uiActions: expected ${short(wanted)}, got ${short(actual)}`);
  }
  return problems;
}
