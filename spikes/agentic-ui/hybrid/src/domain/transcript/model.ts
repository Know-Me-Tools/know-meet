/**
 * The normalised transcript model the durable store holds (entity-graph entities) and the probe
 * reports. Field names follow contract.md §5 so the probe mapping is a straight copy.
 */
import type { CustomRendering } from "../km-custom-parts.ts";

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
export type InterruptStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface MessageRecord {
  readonly id: string;
  readonly role: MessageRole;
  readonly text: string;
  readonly status: MessageStatus;
  readonly runId: string | null;
}

export interface ToolCallRecord {
  readonly id: string;
  readonly name: string;
  readonly argsText: string;
  readonly args: unknown;
  readonly status: ToolCallStatus;
  readonly result?: unknown;
  readonly parentMessageId?: string;
}

export interface InterruptRecord {
  readonly id: string;
  readonly reason: string;
  readonly toolCallId?: string;
  readonly message?: string;
  readonly expiresAt?: string;
  readonly status: InterruptStatus;
}

export interface CustomPartRecord {
  readonly key: string;
  readonly name: string;
  readonly rendering: CustomRendering;
  readonly partId?: string;
  readonly messageId?: string;
}

export interface ActivityRecord {
  readonly messageId: string;
  readonly activityType: string;
  readonly content: unknown;
}

export interface StepRecord {
  readonly name: string;
  readonly status: "running" | "finished";
}

export interface SubagentRecord {
  readonly subagentRunId: string;
  readonly name: string;
  readonly status: "running" | "finished" | "error";
}

export interface ProtocolErrorRecord {
  readonly code: string;
  readonly eventType?: string;
}

export interface RunRecord {
  readonly runId: string | null;
  readonly status: RunStatus;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

/** Entity type names in the durable store (entity-graph `entities[type][id]`). */
export const ENTITY = {
  thread: "km.thread",
  run: "km.run",
  message: "km.message",
  toolCall: "km.toolCall",
  interrupt: "km.interrupt",
  customPart: "km.customPart",
  activity: "km.activity",
  step: "km.step",
  subagent: "km.subagent",
  sharedState: "km.sharedState",
  journalSegment: "km.journalSegment",
} as const;

export type EntityKind = (typeof ENTITY)[keyof typeof ENTITY];
