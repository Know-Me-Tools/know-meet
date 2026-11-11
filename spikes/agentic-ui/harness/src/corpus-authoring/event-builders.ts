/**
 * Typed AG-UI 1.0 event builders. Every builder returns WireItems whose event
 * is checked against the @ag-ui/core types at compile time and against
 * @ag-ui/core/schemas at corpus-validation time.
 */
import { EventType } from "@ag-ui/core";
import type {
  ActivityDeltaEvent,
  ActivitySnapshotEvent,
  ContentPart,
  CustomEvent,
  Interrupt,
  JsonPatchOperation,
  Message,
  MessagesSnapshotEvent,
  RawEvent,
  ReasoningEncryptedValueEvent,
  RunErrorEvent,
  RunFinishedEvent,
  RunFinishedOutcome,
  RunStartedEvent,
  StateDeltaEvent,
  StateSnapshotEvent,
  StepFinishedEvent,
  StepStartedEvent,
  SubagentErrorEvent,
  SubagentFinishedEvent,
  SubagentStartedEvent,
  ToolCallResultEvent,
} from "@ag-ui/core";
import type { AgUiEvent, WireItem } from "../domain/scenario.ts";
import { splitDeltas, type Chunking } from "./tokenize.ts";

/** Placeholder ids; the mock server echoes the request's threadId/runId over them. */
export const THREAD_PLACEHOLDER = "thread-from-request";
export const RUN_PLACEHOLDER = "run-from-request";

export function ev(event: AgUiEvent): WireItem {
  return { kind: "event", event };
}

export function runStarted(): WireItem {
  const e: RunStartedEvent = { type: EventType.RUN_STARTED, threadId: THREAD_PLACEHOLDER, runId: RUN_PLACEHOLDER };
  return ev(e);
}

export function runFinished(outcome?: RunFinishedOutcome): WireItem {
  const e: RunFinishedEvent = {
    type: EventType.RUN_FINISHED,
    threadId: THREAD_PLACEHOLDER,
    runId: RUN_PLACEHOLDER,
    ...(outcome === undefined ? {} : { outcome }),
  };
  return ev(e);
}

export function runError(message: string, code: string): WireItem {
  const e: RunErrorEvent = { type: EventType.RUN_ERROR, message, code };
  return ev(e);
}

/** TEXT_MESSAGE_START, CONTENT deltas, TEXT_MESSAGE_END. */
export function textMessage(messageId: string, text: string, chunking: Chunking = "words"): WireItem[] {
  return [
    ev({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" }),
    ...splitDeltas(text, chunking).map((delta) => ev({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta })),
    ev({ type: EventType.TEXT_MESSAGE_END, messageId }),
  ];
}

/** Opens a message without closing it (used by cancel / drop scenarios). */
export function textMessageOpen(messageId: string, text: string, chunking: Chunking = "words"): WireItem[] {
  return textMessage(messageId, text, chunking).slice(0, -1);
}

/** TEXT_MESSAGE_CHUNK convenience form: first chunk carries messageId and role. */
export function textChunks(messageId: string, text: string): WireItem[] {
  return splitDeltas(text, "words").map((delta, index) =>
    ev(
      index === 0
        ? { type: EventType.TEXT_MESSAGE_CHUNK, messageId, role: "assistant", delta }
        : { type: EventType.TEXT_MESSAGE_CHUNK, messageId, delta },
    ),
  );
}

/** TOOL_CALL_START, ARGS (JSON split into chunks), TOOL_CALL_END. */
export function toolCall(toolCallId: string, toolCallName: string, args: unknown, parentMessageId?: string): WireItem[] {
  return [
    toolCallStart(toolCallId, toolCallName, parentMessageId),
    ...toolCallArgs(toolCallId, args),
    toolCallEnd(toolCallId),
  ];
}

export function toolCallStart(toolCallId: string, toolCallName: string, parentMessageId?: string): WireItem {
  return ev({
    type: EventType.TOOL_CALL_START,
    toolCallId,
    toolCallName,
    ...(parentMessageId === undefined ? {} : { parentMessageId }),
  });
}

export function toolCallArgs(toolCallId: string, args: unknown): WireItem[] {
  const json = JSON.stringify(args);
  const chunks = json.match(/.{1,12}/gs) ?? [json];
  return chunks.map((delta) => ev({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta }));
}

export function toolCallEnd(toolCallId: string): WireItem {
  return ev({ type: EventType.TOOL_CALL_END, toolCallId });
}

/** TOOL_CALL_CHUNK convenience form for a whole call. */
export function toolCallChunks(toolCallId: string, toolCallName: string, args: unknown, parentMessageId: string): WireItem[] {
  const json = JSON.stringify(args);
  const chunks = json.match(/.{1,16}/gs) ?? [json];
  return chunks.map((delta, index) =>
    ev(
      index === 0
        ? { type: EventType.TOOL_CALL_CHUNK, toolCallId, toolCallName, parentMessageId, delta }
        : { type: EventType.TOOL_CALL_CHUNK, toolCallId, delta },
    ),
  );
}

export function toolResult(messageId: string, toolCallId: string, content: string | ContentPart[]): WireItem {
  const e: ToolCallResultEvent = { type: EventType.TOOL_CALL_RESULT, messageId, toolCallId, content, role: "tool" };
  return ev(e);
}

export function custom(name: string, value: unknown): WireItem {
  const e: CustomEvent = { type: EventType.CUSTOM, name, value };
  return ev(e);
}

export function raw(event: unknown, source: string): WireItem {
  const e: RawEvent = { type: EventType.RAW, event, source };
  return ev(e);
}

export function stateSnapshot(snapshot: Readonly<Record<string, unknown>>): WireItem {
  const e: StateSnapshotEvent = { type: EventType.STATE_SNAPSHOT, snapshot };
  return ev(e);
}

export function stateDelta(delta: JsonPatchOperation[]): WireItem {
  const e: StateDeltaEvent = { type: EventType.STATE_DELTA, delta };
  return ev(e);
}

export function stepStarted(stepName: string): WireItem {
  const e: StepStartedEvent = { type: EventType.STEP_STARTED, stepName };
  return ev(e);
}

export function stepFinished(stepName: string): WireItem {
  const e: StepFinishedEvent = { type: EventType.STEP_FINISHED, stepName };
  return ev(e);
}

/** REASONING_START, REASONING_MESSAGE_START/CONTENT/END, REASONING_END. */
export function reasoning(messageId: string, text: string): WireItem[] {
  return [
    ev({ type: EventType.REASONING_START, messageId }),
    ev({ type: EventType.REASONING_MESSAGE_START, messageId, role: "reasoning" }),
    ...splitDeltas(text, "words").map((delta) => ev({ type: EventType.REASONING_MESSAGE_CONTENT, messageId, delta })),
    ev({ type: EventType.REASONING_MESSAGE_END, messageId }),
    ev({ type: EventType.REASONING_END, messageId }),
  ];
}

export function reasoningChunk(messageId: string, delta: string): WireItem {
  return ev({ type: EventType.REASONING_MESSAGE_CHUNK, messageId, delta });
}

export function reasoningEncrypted(entityId: string, encryptedValue: string): WireItem {
  const e: ReasoningEncryptedValueEvent = {
    type: EventType.REASONING_ENCRYPTED_VALUE,
    subtype: "message",
    entityId,
    encryptedValue,
  };
  return ev(e);
}

export function activitySnapshot(messageId: string, activityType: string, content: Record<string, unknown>): WireItem {
  const e: ActivitySnapshotEvent = { type: EventType.ACTIVITY_SNAPSHOT, messageId, activityType, content };
  return ev(e);
}

export function activityDelta(messageId: string, activityType: string, patch: JsonPatchOperation[]): WireItem {
  const e: ActivityDeltaEvent = { type: EventType.ACTIVITY_DELTA, messageId, activityType, patch };
  return ev(e);
}

export function messagesSnapshot(messages: Message[]): WireItem {
  const e: MessagesSnapshotEvent = { type: EventType.MESSAGES_SNAPSHOT, messages };
  return ev(e);
}

export function subagentStarted(subagentRunId: string, name: string, parentToolCallId?: string): WireItem {
  const e: SubagentStartedEvent = {
    type: EventType.SUBAGENT_STARTED,
    subagentRunId,
    name,
    ...(parentToolCallId === undefined ? {} : { parentToolCallId }),
  };
  return ev(e);
}

export function subagentFinished(subagentRunId: string, result?: unknown): WireItem {
  const e: SubagentFinishedEvent = {
    type: EventType.SUBAGENT_FINISHED,
    subagentRunId,
    outcome: { type: "success" },
    ...(result === undefined ? {} : { result }),
  };
  return ev(e);
}

export function subagentError(subagentRunId: string, message: string, code: string): WireItem {
  const e: SubagentErrorEvent = { type: EventType.SUBAGENT_ERROR, subagentRunId, message, code };
  return ev(e);
}

/** AG-UI tool-approval interrupt (reason "tool_call", payload `{ approved, reason? }`). */
export function approvalInterrupt(id: string, toolCallId: string, message: string): Interrupt {
  return {
    id,
    reason: "tool_call",
    toolCallId,
    message,
    responseSchema: {
      type: "object",
      properties: { approved: { type: "boolean" }, reason: { type: "string" } },
      required: ["approved"],
    },
    // Rewritten at serve time (rewrites.interruptExpiresInMs); valid ISO placeholder.
    expiresAt: "2099-01-01T00:00:00.000Z",
  };
}

/** Concatenated assistant text of a message across its CONTENT/CHUNK deltas. */
export function textOf(items: readonly WireItem[], messageId: string): string {
  let text = "";
  for (const item of items) {
    if (item.kind !== "event") continue;
    const e = item.event;
    if ((e.type === EventType.TEXT_MESSAGE_CONTENT || e.type === EventType.TEXT_MESSAGE_CHUNK) && e.messageId === messageId) {
      text += e.delta ?? "";
    }
  }
  return text;
}
