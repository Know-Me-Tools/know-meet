/**
 * The normalised transcript of one thread: runs, messages, tool calls,
 * human-in-the-loop interrupts, custom parts, activities (A2UI surfaces ride
 * on these), shared state and protocol errors. Plain immutable data.
 */
import type { JsonObject } from "./agui-event.ts";

export type RunStatus = "idle" | "running" | "finished" | "interrupted" | "cancelled" | "error";
export type MessageStatus = "streaming" | "complete" | "cancelled" | "error";
export type MessageRole = "user" | "assistant" | "system" | "developer" | "tool" | "reasoning" | "activity";

export type ToolCallStatus =
  | "streaming-args"
  | "awaiting-result"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "expired"
  | "complete"
  | "error";

/** Human-in-the-loop interrupt lifecycle (see hitl-machine.ts). */
export type InterruptStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled" | "failed";

export interface TranscriptMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly text: string;
  readonly status: MessageStatus;
  /** Opened by a *_CHUNK event: closes on the next event that is not one of its chunks. */
  readonly chunkMode: boolean;
  /** Reasoning whose content arrived encrypted: never shown as text. */
  readonly encrypted: boolean;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly argsText: string;
  /** Parsed JSON once the arguments are complete; the raw text otherwise. */
  readonly args: unknown;
  readonly status: ToolCallStatus;
  readonly hasResult: boolean;
  readonly result?: unknown;
  readonly parentMessageId?: string;
  readonly chunkMode: boolean;
}

export interface Interrupt {
  readonly id: string;
  readonly reason: string;
  readonly message?: string;
  readonly toolCallId?: string;
  /** Epoch milliseconds; absent means it never expires. */
  readonly expiresAtMs?: number;
  readonly status: InterruptStatus;
}

export type CustomRendering = "renderer" | "fallback" | "blocked";

export interface CustomPart {
  readonly key: string;
  readonly name: string;
  readonly rendering: CustomRendering;
  readonly messageId?: string;
  readonly partId?: string;
  /** Validated value for known renderers; the raw value for the fallback. */
  readonly value: unknown;
  readonly blockedReason?: string;
}

export interface Activity {
  readonly messageId: string;
  readonly activityType: string;
  readonly content: JsonObject;
}

export interface Step {
  readonly name: string;
  readonly status: "running" | "finished";
}

export interface Subagent {
  readonly subagentRunId: string;
  readonly name: string;
  readonly status: "running" | "finished" | "error";
}

export interface ProtocolError {
  readonly code: string;
  readonly eventType?: string;
  readonly detail?: string;
}

export interface TranscriptState {
  readonly threadId: string | null;
  readonly runStatus: RunStatus;
  readonly runErrorCode?: string;
  readonly runErrorMessage?: string;
  /** True between RUN_STARTED and RUN_FINISHED/RUN_ERROR: agent events are accepted. */
  readonly runOpen: boolean;
  readonly messageOrder: readonly string[];
  readonly messages: Readonly<Record<string, TranscriptMessage>>;
  readonly toolOrder: readonly string[];
  readonly toolCalls: Readonly<Record<string, ToolCall>>;
  readonly interruptOrder: readonly string[];
  readonly interrupts: Readonly<Record<string, Interrupt>>;
  readonly state: unknown;
  readonly customParts: readonly CustomPart[];
  readonly activityOrder: readonly string[];
  readonly activities: Readonly<Record<string, Activity>>;
  readonly steps: readonly Step[];
  readonly subagents: readonly Subagent[];
  readonly protocolErrors: readonly ProtocolError[];
}

export function emptyTranscript(threadId: string | null): TranscriptState {
  return {
    threadId,
    runStatus: "idle",
    runOpen: false,
    messageOrder: [],
    messages: {},
    toolOrder: [],
    toolCalls: {},
    interruptOrder: [],
    interrupts: {},
    state: null,
    customParts: [],
    activityOrder: [],
    activities: {},
    steps: [],
    subagents: [],
    protocolErrors: [],
  };
}

export function isRunSettled(status: RunStatus): boolean {
  return status === "finished" || status === "interrupted" || status === "cancelled" || status === "error";
}
