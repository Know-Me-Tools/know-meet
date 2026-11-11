/**
 * Boundary validation for AG-UI frames: JSON parse, then @ag-ui/core 1.0.4's
 * zod EventSchemas. A frame that fails either step becomes a protocol error
 * (recorded, skipped) instead of failing the run.
 */
import { EventSchemas } from "@ag-ui/core/schemas";
import type { AgUiDomainEvent } from "../domain/agui-event.ts";

export type DecodeResult =
  | { readonly ok: true; readonly event: AgUiDomainEvent }
  | { readonly ok: false; readonly code: string; readonly eventType?: string };

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  "TEXT_MESSAGE_START", "TEXT_MESSAGE_CONTENT", "TEXT_MESSAGE_END", "TEXT_MESSAGE_CHUNK",
  "TOOL_CALL_START", "TOOL_CALL_ARGS", "TOOL_CALL_END", "TOOL_CALL_CHUNK", "TOOL_CALL_RESULT",
  "REASONING_START", "REASONING_MESSAGE_START", "REASONING_MESSAGE_CONTENT", "REASONING_MESSAGE_END",
  "REASONING_MESSAGE_CHUNK", "REASONING_END", "REASONING_ENCRYPTED_VALUE",
  "STATE_SNAPSHOT", "STATE_DELTA", "MESSAGES_SNAPSHOT", "ACTIVITY_SNAPSHOT", "ACTIVITY_DELTA",
  "RAW", "CUSTOM", "RUN_STARTED", "RUN_FINISHED", "RUN_ERROR", "STEP_STARTED", "STEP_FINISHED",
  "SUBAGENT_STARTED", "SUBAGENT_FINISHED", "SUBAGENT_ERROR",
]);

function typeOf(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const type = (value as { readonly type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

export function decodeFrame(data: string): DecodeResult {
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return { ok: false, code: "invalid-json" };
  }
  const type = typeOf(json);
  if (type === undefined) return { ok: false, code: "missing-type" };
  if (!KNOWN_TYPES.has(type)) return { ok: false, code: "unknown-event-type", eventType: type };
  const parsed = EventSchemas.safeParse(json);
  if (!parsed.success) return { ok: false, code: "schema-invalid", eventType: type };
  // The zod schema validated the shape; AgUiDomainEvent is the subset of those
  // fields the reducer reads, with the enum `type` as its string value.
  return { ok: true, event: parsed.data as unknown as AgUiDomainEvent };
}
