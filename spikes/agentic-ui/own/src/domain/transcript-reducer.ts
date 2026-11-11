/**
 * Pure transcript reducer: (state, action) -> state. Agent actions carry AG-UI
 * events; client actions carry what the user or the transport did. Events that
 * break ordering rules are recorded as protocol errors and otherwise ignored,
 * so text from a rejected event never reaches the transcript.
 */
import type { AgUiDomainEvent, InterruptRequest, JsonObject, RunOutcome, SnapshotMessageInput } from "./agui-event.ts";
import { toolStatusFor, transition, type HitlCommand, type ResumeEntry } from "./hitl-machine.ts";
import { applyPatch } from "./json-patch.ts";
import {
  addMessage,
  appendArgs,
  appendText,
  bad,
  chunkMessage,
  chunkTool,
  closeChunks,
  closeOpenMessages,
  contentToText,
  endMessage,
  endTool,
  failOpenTools,
  markEncrypted,
  ok,
  setToolStatus,
  startMessage,
  startTool,
  toolResult,
  toRole,
  type Step,
} from "./reducer-content.ts";
import type { CustomPart, Interrupt, InterruptStatus, TranscriptMessage, TranscriptState } from "./transcript-model.ts";

export interface ReduceContext {
  /** Classifies a CUSTOM event (schema, renderer registry, media policy). */
  readonly classifyCustom: (name: string, value: unknown) => Omit<CustomPart, "key">;
}

export type ClientAction =
  | { readonly type: "USER_MESSAGE"; readonly id: string; readonly text: string }
  | { readonly type: "RUN_REQUESTED" }
  | { readonly type: "RUN_ABORTED" }
  | { readonly type: "TRANSPORT_FAILED"; readonly message: string }
  | { readonly type: "PROTOCOL_ERROR"; readonly code: string; readonly eventType?: string; readonly detail?: string };

function recordError(state: TranscriptState, code: string, eventType?: string): TranscriptState {
  return { ...state, protocolErrors: [...state.protocolErrors, eventType === undefined ? { code } : { code, eventType }] };
}

function settle(step: Step, state: TranscriptState, eventType: string): TranscriptState {
  return step.ok ? step.state : recordError(state, step.code, eventType);
}

function toInterrupt(request: InterruptRequest): Interrupt {
  const expires = request.expiresAt === undefined ? Number.NaN : Date.parse(request.expiresAt);
  return {
    id: request.id,
    reason: request.reason,
    status: "pending",
    ...(request.message === undefined ? {} : { message: request.message }),
    ...(request.toolCallId === undefined ? {} : { toolCallId: request.toolCallId }),
    ...(Number.isFinite(expires) ? { expiresAtMs: expires } : {}),
  };
}

function finishRun(state: TranscriptState, outcome: RunOutcome | undefined): TranscriptState {
  const closed = { ...state, runOpen: false };
  if (outcome?.type === "cancelled") return { ...closeOpenMessages(failOpenTools(closed), "cancelled"), runStatus: "cancelled" };
  const done = closeOpenMessages(closeChunks(failOpenTools(closed), false, false), "complete");
  if (outcome?.type !== "interrupt") return { ...done, runStatus: "finished" };
  let next: TranscriptState = { ...done, runStatus: "interrupted" };
  for (const request of outcome.interrupts) {
    const interrupt = toInterrupt(request);
    next = {
      ...next,
      interrupts: { ...next.interrupts, [interrupt.id]: interrupt },
      interruptOrder: next.interruptOrder.includes(interrupt.id) ? next.interruptOrder : [...next.interruptOrder, interrupt.id],
    };
    if (interrupt.toolCallId !== undefined) next = setToolStatus(next, interrupt.toolCallId, "pending-approval");
  }
  return next;
}

function failRun(state: TranscriptState, code: string, message: string): TranscriptState {
  return { ...closeOpenMessages(failOpenTools(state), "error"), runOpen: false, runStatus: "error", runErrorCode: code, runErrorMessage: message };
}

function snapshotMessage(input: SnapshotMessageInput): TranscriptMessage {
  return { id: input.id, role: toRole(input.role, "assistant"), text: contentToText(input.content), status: "complete", chunkMode: false, encrypted: false };
}

function replaceMessages(state: TranscriptState, inputs: readonly SnapshotMessageInput[]): TranscriptState {
  const messages: Record<string, TranscriptMessage> = {};
  const activities = { ...state.activities };
  const activityOrder = [...state.activityOrder];
  for (const input of inputs) {
    messages[input.id] = snapshotMessage(input);
    if (input.role === "activity" && typeof input.content === "object" && input.content !== null) {
      activities[input.id] = { messageId: input.id, activityType: input.activityType ?? "", content: input.content as JsonObject };
      if (!activityOrder.includes(input.id)) activityOrder.push(input.id);
    }
  }
  return { ...state, messages, messageOrder: inputs.map((m) => m.id), activities, activityOrder };
}

function putActivity(state: TranscriptState, messageId: string, activityType: string, content: JsonObject): TranscriptState {
  const isNew = !Object.hasOwn(state.activities, messageId);
  const withActivity: TranscriptState = {
    ...state,
    activities: { ...state.activities, [messageId]: { messageId, activityType, content } },
    activityOrder: isNew ? [...state.activityOrder, messageId] : state.activityOrder,
  };
  return isNew ? addMessage(withActivity, messageId, "activity", "", "complete") : withActivity;
}

function reduceActivity(state: TranscriptState, event: Extract<AgUiDomainEvent, { type: "ACTIVITY_SNAPSHOT" | "ACTIVITY_DELTA" }>): Step {
  const existing = state.activities[event.messageId];
  if (event.type === "ACTIVITY_SNAPSHOT") {
    if (existing !== undefined && event.replace === false) return ok(state);
    return ok(putActivity(state, event.messageId, event.activityType, event.content));
  }
  if (existing === undefined) return bad("unknown-activity");
  const patched = applyPatch(existing.content, event.patch);
  if (!patched.ok || typeof patched.value !== "object" || patched.value === null) return bad("activity-patch-failed");
  return ok(putActivity(state, event.messageId, existing.activityType, patched.value as JsonObject));
}

function upsertNamed<T extends { readonly name: string }>(list: readonly T[], item: T): readonly T[] {
  const index = list.findIndex((s) => s.name === item.name);
  return index === -1 ? [...list, item] : list.map((s, i) => (i === index ? item : s));
}

function setSubagent(state: TranscriptState, id: string, name: string | null, status: "running" | "finished" | "error"): Step {
  const existing = state.subagents.find((s) => s.subagentRunId === id);
  if (existing === undefined && name === null) return bad("unknown-subagent");
  const item = { subagentRunId: id, name: name ?? existing?.name ?? "", status };
  const subagents = existing === undefined ? [...state.subagents, item] : state.subagents.map((s) => (s.subagentRunId === id ? item : s));
  return ok({ ...state, subagents });
}

function reduceLifecycle(state: TranscriptState, event: AgUiDomainEvent, ctx: ReduceContext): Step {
  switch (event.type) {
    case "STATE_SNAPSHOT":
      return ok({ ...state, state: event.snapshot });
    case "STATE_DELTA": {
      const patched = applyPatch(state.state, event.delta);
      return patched.ok ? ok({ ...state, state: patched.value }) : bad("state-patch-failed");
    }
    case "MESSAGES_SNAPSHOT":
      return ok(replaceMessages(state, event.messages));
    case "ACTIVITY_SNAPSHOT":
    case "ACTIVITY_DELTA":
      return reduceActivity(state, event);
    case "CUSTOM": {
      const part = ctx.classifyCustom(event.name, event.value);
      const key = `${part.name}#${part.partId ?? state.customParts.length}`;
      return ok({ ...state, customParts: [...state.customParts, { ...part, key }] });
    }
    case "RAW":
      return ok(state);
    case "STEP_STARTED":
      return ok({ ...state, steps: upsertNamed(state.steps, { name: event.stepName, status: "running" }) });
    case "STEP_FINISHED":
      return state.steps.some((s) => s.name === event.stepName)
        ? ok({ ...state, steps: upsertNamed(state.steps, { name: event.stepName, status: "finished" }) })
        : bad("unknown-step");
    case "SUBAGENT_STARTED":
      return setSubagent(state, event.subagentRunId, event.name, "running");
    case "SUBAGENT_FINISHED":
      return setSubagent(state, event.subagentRunId, null, "finished");
    case "SUBAGENT_ERROR":
      return setSubagent(state, event.subagentRunId, null, "error");
    default:
      return reduceContent(state, event);
  }
}

function reduceContent(state: TranscriptState, event: AgUiDomainEvent): Step {
  switch (event.type) {
    case "TEXT_MESSAGE_START":
      return startMessage(state, event.messageId, toRole(event.role, "assistant"), false);
    case "TEXT_MESSAGE_CONTENT":
    case "REASONING_MESSAGE_CONTENT":
      return appendText(state, event.messageId, event.delta);
    case "TEXT_MESSAGE_END":
    case "REASONING_MESSAGE_END":
      return endMessage(state, event.messageId);
    case "TEXT_MESSAGE_CHUNK":
      return chunkMessage(state, event.messageId, toRole(event.role, "assistant"), event.delta);
    case "REASONING_MESSAGE_START":
      return startMessage(state, event.messageId, "reasoning", false);
    case "REASONING_MESSAGE_CHUNK":
      return chunkMessage(state, event.messageId, "reasoning", event.delta);
    case "REASONING_ENCRYPTED_VALUE":
      return markEncrypted(state, event.entityId);
    case "REASONING_START":
    case "REASONING_END":
      return ok(state);
    case "TOOL_CALL_START":
      return startTool(state, event.toolCallId, event.toolCallName, event.parentMessageId, false);
    case "TOOL_CALL_ARGS":
      return appendArgs(state, event.toolCallId, event.delta);
    case "TOOL_CALL_END":
      return endTool(state, event.toolCallId);
    case "TOOL_CALL_CHUNK":
      return chunkTool(state, event.toolCallId, event.toolCallName, event.parentMessageId, event.delta);
    case "TOOL_CALL_RESULT":
      return toolResult(state, event.toolCallId, event.content);
    default:
      return bad("unhandled-event");
  }
}

/** Applies one AG-UI event. Ordering violations become protocol errors. */
export function reduceAgentEvent(state: TranscriptState, event: AgUiDomainEvent, ctx: ReduceContext): TranscriptState {
  if (event.type === "RUN_STARTED") {
    if (state.runOpen) return recordError(state, "run-already-started", event.type);
    const { runErrorCode: _code, runErrorMessage: _message, ...rest } = state;
    return { ...rest, runOpen: true, runStatus: "running" };
  }
  if (!state.runOpen) return recordError(state, "event-outside-run", event.type);
  const prepared = closeChunks(state, event.type === "TEXT_MESSAGE_CHUNK", event.type === "TOOL_CALL_CHUNK");
  if (event.type === "RUN_FINISHED") return finishRun(prepared, event.outcome);
  if (event.type === "RUN_ERROR") return failRun(prepared, event.code ?? "RUN_ERROR", event.message);
  return settle(reduceLifecycle(prepared, event, ctx), state, event.type);
}

export function reduceClientAction(state: TranscriptState, action: ClientAction): TranscriptState {
  switch (action.type) {
    case "USER_MESSAGE":
      return addMessage(state, action.id, "user", action.text, "complete");
    case "RUN_REQUESTED":
      return { ...state, runStatus: "running" };
    case "RUN_ABORTED":
      return { ...closeOpenMessages(failOpenTools(state), "cancelled"), runOpen: false, runStatus: "cancelled" };
    case "TRANSPORT_FAILED":
      return failRun(state, "TRANSPORT_ERROR", action.message);
    case "PROTOCOL_ERROR":
      return { ...state, protocolErrors: [...state.protocolErrors, { code: action.code, ...(action.eventType === undefined ? {} : { eventType: action.eventType }) }] };
  }
}

export interface HitlResult {
  readonly state: TranscriptState;
  readonly accepted: boolean;
  readonly resume: ResumeEntry | null;
}

function setInterruptStatus(state: TranscriptState, interrupt: Interrupt, status: InterruptStatus): TranscriptState {
  const next: TranscriptState = { ...state, interrupts: { ...state.interrupts, [interrupt.id]: { ...interrupt, status } } };
  return interrupt.toolCallId === undefined ? next : setToolStatus(next, interrupt.toolCallId, toolStatusFor(status));
}

/** Runs one HITL command through the state machine and records the outcome. */
export function applyHitl(state: TranscriptState, interruptId: string, command: HitlCommand, nowMs: number): HitlResult {
  const interrupt = state.interrupts[interruptId];
  if (interrupt === undefined) return { state, accepted: false, resume: null };
  const result = transition(interrupt, command, nowMs);
  if (!result.accepted) return { state, accepted: false, resume: null };
  return { state: setInterruptStatus(state, interrupt, result.status), accepted: true, resume: result.resume };
}
