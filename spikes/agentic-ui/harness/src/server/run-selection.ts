/**
 * Chooses which run of a scenario a request gets, in this order:
 *   1. Last-Event-ID present  -> replay the session's last run from that position
 *   2. resume[] present       -> the matching resume run (or resume-after-expiry)
 *   3. a2uiAction present     -> the matching a2ui-action run
 *   4. otherwise              -> the initial run
 */
import type { ScenarioFile } from "../domain/scenario.ts";
import type { ParsedRunInput } from "./run-input.ts";
import type { RequestTrigger, SessionLog } from "./session-log.ts";

export type RunSelection =
  | {
      readonly kind: "run";
      readonly runIndex: number;
      readonly startAt: number;
      readonly trigger: RequestTrigger;
      readonly resolvedAfterExpiry: boolean;
    }
  | { readonly kind: "no-content"; readonly runIndex: number; readonly note: string }
  | { readonly kind: "unmatched"; readonly note: string };

function parseLastEventId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

function selectReplay(scenario: ScenarioFile, session: SessionLog, lastEventId: string): RunSelection {
  const position = parseLastEventId(lastEventId);
  if (position === null) return { kind: "unmatched", note: `Last-Event-ID "${lastEventId}" is not a non-negative integer` };
  const runIndex = session.lastRunIndex ?? scenario.runs.findIndex((r) => r.trigger.kind === "initial");
  const run = scenario.runs[runIndex];
  if (run === undefined) return { kind: "unmatched", note: "no run to replay" };
  if (position >= run.items.length) return { kind: "no-content", runIndex, note: `Last-Event-ID ${position} is at or past the end (${run.items.length})` };
  return { kind: "run", runIndex, startAt: position, trigger: "replay", resolvedAfterExpiry: false };
}

function selectResume(scenario: ScenarioFile, session: SessionLog, input: ParsedRunInput, now: number): RunSelection {
  const [entry] = input.resume;
  if (entry === undefined) return { kind: "unmatched", note: "empty resume" };
  const expiry = session.interruptExpiries[entry.interruptId];
  const expired = expiry !== undefined && Date.parse(expiry) <= now;
  if (expired && entry.status === "resolved") {
    const runIndex = scenario.runs.findIndex((r) => r.trigger.kind === "resume-after-expiry" && r.trigger.interruptId === entry.interruptId);
    if (runIndex === -1) return { kind: "unmatched", note: `interrupt ${entry.interruptId} expired and the scenario has no resume-after-expiry run` };
    return { kind: "run", runIndex, startAt: 0, trigger: "resume-after-expiry", resolvedAfterExpiry: true };
  }
  const runIndex = scenario.runs.findIndex((r) => {
    const t = r.trigger;
    if (t.kind !== "resume" || t.interruptId !== entry.interruptId || t.status !== entry.status) return false;
    return entry.status === "cancelled" || t.approved === entry.approved;
  });
  if (runIndex === -1) {
    return { kind: "unmatched", note: `no resume run for ${entry.interruptId} status=${entry.status} approved=${String(entry.approved)}` };
  }
  return { kind: "run", runIndex, startAt: 0, trigger: "resume", resolvedAfterExpiry: false };
}

function selectA2uiAction(scenario: ScenarioFile, name: string): RunSelection {
  const runIndex = scenario.runs.findIndex((r) => r.trigger.kind === "a2ui-action" && r.trigger.actionName === name);
  if (runIndex === -1) return { kind: "unmatched", note: `no a2ui-action run for action "${name}"` };
  return { kind: "run", runIndex, startAt: 0, trigger: "a2ui-action", resolvedAfterExpiry: false };
}

export function selectRun(
  scenario: ScenarioFile,
  session: SessionLog,
  input: ParsedRunInput,
  lastEventId: string | null,
  now: number = Date.now(),
): RunSelection {
  if (lastEventId !== null) return selectReplay(scenario, session, lastEventId);
  if (input.resume.length > 0) return selectResume(scenario, session, input, now);
  if (input.a2uiAction !== null) return selectA2uiAction(scenario, input.a2uiAction.name);
  const runIndex = scenario.runs.findIndex((r) => r.trigger.kind === "initial");
  if (runIndex === -1) return { kind: "unmatched", note: "scenario has no initial run" };
  return { kind: "run", runIndex, startAt: 0, trigger: "initial", resolvedAfterExpiry: false };
}
