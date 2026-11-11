/**
 * Validates scenario files against @ag-ui/core/schemas (EventSchema,
 * RunAgentInput-related schemas) plus ordering rules and km.* CUSTOM values.
 */
import { EventSchema } from "@ag-ui/core/schemas";
import { EventType } from "@ag-ui/core";
import type { ScenarioFile, ScenarioRun, WireItem } from "../domain/scenario.ts";
import { isKnownKmCustom, KM_CUSTOM_SCHEMAS } from "../domain/custom-chunks.ts";
import { A2UI_ACTIVITY_TYPE } from "../domain/versions.ts";
import { DEFAULT_ORIGINS, substituteJson } from "../shared/placeholders.ts";
import { parseSse } from "../shared/sse.ts";
import { orderingViolations, type OrderingInput } from "./ordering.ts";

export interface RunReport {
  readonly trigger: string;
  readonly items: number;
  readonly schemaInvalid: readonly number[];
  readonly orderingInvalid: readonly number[];
  readonly customValueErrors: readonly string[];
  readonly a2uiActivityItems: readonly number[];
}

export interface ScenarioReport {
  readonly id: string;
  readonly ok: boolean;
  readonly problems: readonly string[];
  readonly runs: readonly RunReport[];
  readonly eventTypes: readonly string[];
}

type ParsedItem = { readonly ok: true; readonly event: { readonly type: string; readonly [k: string]: unknown } } | { readonly ok: false } | { readonly ok: "skip" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItem(item: WireItem): ParsedItem {
  let candidate: unknown;
  if (item.kind === "raw-sse") {
    const frames = parseSse(item.rawSse).filter((f) => f.data !== null);
    if (frames.length === 0) return { ok: "skip" };
    try {
      candidate = JSON.parse(frames[0]?.data ?? "");
    } catch {
      return { ok: false };
    }
  } else {
    candidate = item.event;
  }
  const result = EventSchema.safeParse(candidate);
  if (!result.success || !isRecord(candidate) || typeof candidate["type"] !== "string") return { ok: false };
  return { ok: true, event: { ...candidate, type: candidate["type"] } };
}

function customValueErrors(event: { readonly type: string; readonly [k: string]: unknown }): string[] {
  if (event.type !== EventType.CUSTOM) return [];
  const name = typeof event["name"] === "string" ? event["name"] : "";
  if (!isKnownKmCustom(name)) return [];
  const value = substituteJson(event["value"], DEFAULT_ORIGINS);
  const parsed = KM_CUSTOM_SCHEMAS[name].safeParse(value);
  return parsed.success ? [] : [`${name}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`];
}

function triggerLabel(run: ScenarioRun): string {
  const t = run.trigger;
  switch (t.kind) {
    case "initial":
      return "initial";
    case "resume":
      return `resume:${t.interruptId}:${t.status}${t.approved === undefined ? "" : `:approved=${String(t.approved)}`}`;
    case "resume-after-expiry":
      return `resume-after-expiry:${t.interruptId}`;
    case "a2ui-action":
      return `a2ui-action:${t.actionName}`;
  }
}

function validateRun(run: ScenarioRun, types: Set<string>): RunReport {
  const schemaInvalid: number[] = [];
  const ordering: OrderingInput[] = [];
  const customErrors: string[] = [];
  const a2uiItems: number[] = [];
  run.items.forEach((item, index) => {
    const parsed = parseItem(item);
    if (parsed.ok === "skip") return;
    if (parsed.ok === false) {
      schemaInvalid.push(index);
      return;
    }
    types.add(parsed.event.type);
    ordering.push({ index, event: parsed.event });
    customErrors.push(...customValueErrors(parsed.event));
    if (parsed.event["activityType"] === A2UI_ACTIVITY_TYPE) a2uiItems.push(index);
  });
  return {
    trigger: triggerLabel(run),
    items: run.items.length,
    schemaInvalid,
    orderingInvalid: orderingViolations(ordering),
    customValueErrors: customErrors,
    a2uiActivityItems: a2uiItems,
  };
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  const left = [...new Set(a)].sort((x, y) => x - y);
  const right = [...new Set(b)].sort((x, y) => x - y);
  return left.length === right.length && left.every((v, i) => v === right[i]);
}

export function validateScenario(scenario: ScenarioFile): ScenarioReport {
  const types = new Set<string>();
  const runs = scenario.runs.map((run) => validateRun(run, types));
  const problems: string[] = [];
  const triggers = runs.map((r) => r.trigger);
  if (new Set(triggers).size !== triggers.length) problems.push(`duplicate run triggers: ${triggers.join(", ")}`);
  if (!scenario.runs.some((r) => r.trigger.kind === "initial")) problems.push("no initial run");
  runs.forEach((run, runIndex) => {
    for (const error of run.customValueErrors) problems.push(`run ${runIndex}: invalid custom value ${error}`);
    const invalid = [...run.schemaInvalid, ...run.orderingInvalid];
    if (scenario.validity === "intentionally-invalid" && runIndex === 0) {
      if (!sameSet(invalid, scenario.expectedInvalidItems ?? [])) {
        problems.push(`run 0: invalid items [${invalid.join(",")}] != expectedInvalidItems [${(scenario.expectedInvalidItems ?? []).join(",")}]`);
      }
    } else if (invalid.length > 0) {
      problems.push(`run ${runIndex} (${run.trigger}): schema-invalid [${run.schemaInvalid.join(",")}], ordering-invalid [${run.orderingInvalid.join(",")}]`);
    }
  });
  return { id: scenario.id, ok: problems.length === 0, problems, runs, eventTypes: [...types].sort() };
}

/** Event types never exercised by any valid event in the corpus. */
export function missingEventTypes(reports: readonly ScenarioReport[]): string[] {
  const seen = new Set(reports.flatMap((r) => r.eventTypes));
  return Object.values(EventType).filter((t) => !seen.has(t));
}
