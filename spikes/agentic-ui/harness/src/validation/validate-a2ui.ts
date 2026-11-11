/**
 * Validates A2UI v1.0 golden surfaces (and A2UI operations carried in AG-UI
 * activity events) with @a2ui/web_core 0.15.0's MessageProcessor under
 * STRICT_VALIDATION and the v1.0 basic catalog.
 */
import { basicCatalog, MessageProcessor, STRICT_VALIDATION } from "@a2ui/web_core/v1_0";
import { EventType } from "@ag-ui/core";
import type { GoldenSurfaceFile } from "../domain/a2ui-surface.ts";
import type { ScenarioFile } from "../domain/scenario.ts";
import { A2UI_ACTIVITY_TYPE, A2UI_OPERATIONS_KEY } from "../domain/versions.ts";
import { DEFAULT_ORIGINS, substituteJson } from "../shared/placeholders.ts";

export interface A2uiReport {
  readonly id: string;
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly problems: readonly string[];
}

/** Runs messages through a fresh processor; returns the collected error strings. */
export function processA2ui(messages: readonly unknown[]): { readonly errors: string[]; readonly processor: MessageProcessor } {
  const errors: string[] = [];
  const processor = new MessageProcessor([basicCatalog], undefined, {
    validationConfig: STRICT_VALIDATION,
    errorHandler: (error) => errors.push(JSON.stringify(error)),
  });
  for (const message of messages) {
    try {
      processor.processMessages([substituteJson(message, DEFAULT_ORIGINS)] as Parameters<MessageProcessor["processMessages"]>[0]);
    } catch (thrown) {
      errors.push(thrown instanceof Error ? thrown.message : String(thrown));
    }
  }
  return { errors, processor };
}

function componentIds(messages: readonly Readonly<Record<string, unknown>>[]): Set<string> {
  const ids = new Set<string>();
  for (const message of messages) {
    const update = message["updateComponents"];
    if (typeof update !== "object" || update === null) continue;
    const components = (update as { readonly components?: unknown }).components;
    if (!Array.isArray(components)) continue;
    for (const component of components) {
      if (typeof component === "object" && component !== null && typeof (component as { readonly id?: unknown }).id === "string") {
        ids.add((component as { readonly id: string }).id);
      }
    }
  }
  return ids;
}

export function validateSurface(surface: GoldenSurfaceFile): A2uiReport {
  const { errors, processor } = processA2ui(surface.messages);
  const problems: string[] = [];
  const model = processor.getSurface(surface.surfaceId);
  if (surface.expected.deleted === true && model !== undefined) problems.push("surface expected deleted but still exists");
  if (surface.expected.deleted !== true && model === undefined) problems.push("surface missing after processing");
  if (surface.expected.dataModel !== undefined && model !== undefined) {
    const actual: unknown = model.dataModel.get("/");
    if (JSON.stringify(actual) !== JSON.stringify(surface.expected.dataModel)) {
      problems.push(`data model ${JSON.stringify(actual)} != expected ${JSON.stringify(surface.expected.dataModel)}`);
    }
  }
  if (surface.validation.mode === "strict-pass" && errors.length > 0) problems.push("expected strict pass but got errors");
  if (surface.validation.mode === "strict-fail-expected") {
    if (errors.length === 0) problems.push("expected strict validation errors but got none");
    for (const needle of surface.validation.errorIncludes) {
      if (!errors.some((e) => e.includes(needle))) problems.push(`no error mentions "${needle}"`);
    }
  }
  const ids = componentIds(surface.messages);
  for (const id of [...surface.expected.renderedComponentIds, ...surface.expected.fallbackComponentIds]) {
    if (!ids.has(id)) problems.push(`expected component "${id}" is not defined in any updateComponents`);
  }
  for (const interaction of surface.interactions) {
    if (!ids.has(interaction.click)) problems.push(`interaction clicks unknown component "${interaction.click}"`);
  }
  for (const message of surface.messages) {
    if (message["version"] !== surface.a2uiSpecVersion) problems.push(`message version ${String(message["version"])} != ${surface.a2uiSpecVersion}`);
  }
  return { id: surface.id, ok: problems.length === 0, errors, problems };
}

/** Applies the A2UI operations carried by a scenario's activity events, in wire order across runs. */
export function validateScenarioA2ui(scenario: ScenarioFile): A2uiReport | null {
  const operations: unknown[] = [];
  for (const run of scenario.runs) {
    for (const item of run.items) {
      if (item.kind !== "event") continue;
      const e = item.event;
      if (e.type === EventType.ACTIVITY_SNAPSHOT && e.activityType === A2UI_ACTIVITY_TYPE) {
        const ops: unknown = e.content[A2UI_OPERATIONS_KEY];
        if (Array.isArray(ops)) operations.push(...ops);
      }
      if (e.type === EventType.ACTIVITY_DELTA && e.activityType === A2UI_ACTIVITY_TYPE) {
        for (const patch of e.patch) if (patch.op === "add") operations.push(patch.value);
      }
    }
  }
  if (operations.length === 0) return null;
  const { errors } = processA2ui(operations);
  return { id: scenario.id, ok: errors.length === 0, errors, problems: errors.length > 0 ? ["A2UI operations in activity events failed strict validation"] : [] };
}
