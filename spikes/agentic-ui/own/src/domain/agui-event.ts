/**
 * Domain view of the AG-UI 1.0 event stream: the fields the transcript reducer
 * reads, as plain string-literal unions. No protocol SDK is imported here; the
 * infrastructure decoder validates frames against @ag-ui/core's schemas and
 * hands over events of this shape.
 */

export type JsonObject = Readonly<Record<string, unknown>>;

export interface PatchOperation {
  readonly op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  readonly path: string;
  readonly value?: unknown;
  readonly from?: string;
}

export interface InterruptRequest {
  readonly id: string;
  readonly reason: string;
  readonly message?: string;
  readonly toolCallId?: string;
  readonly expiresAt?: string;
}

export type RunOutcome =
  | { readonly type: "success" }
  | { readonly type: "cancelled"; readonly reason?: string }
  | { readonly type: "interrupt"; readonly interrupts: readonly InterruptRequest[] };

export interface SnapshotMessageInput {
  readonly id: string;
  readonly role: string;
  readonly content?: unknown;
  readonly activityType?: string;
  readonly toolCallId?: string;
}

export type AgUiDomainEvent =
  | { readonly type: "RUN_STARTED"; readonly threadId: string; readonly runId: string }
  | { readonly type: "RUN_FINISHED"; readonly threadId: string; readonly runId: string; readonly outcome?: RunOutcome }
  | { readonly type: "RUN_ERROR"; readonly message: string; readonly code?: string }
  | { readonly type: "STEP_STARTED"; readonly stepName: string }
  | { readonly type: "STEP_FINISHED"; readonly stepName: string }
  | { readonly type: "TEXT_MESSAGE_START"; readonly messageId: string; readonly role?: string }
  | { readonly type: "TEXT_MESSAGE_CONTENT"; readonly messageId: string; readonly delta: string }
  | { readonly type: "TEXT_MESSAGE_END"; readonly messageId: string }
  | { readonly type: "TEXT_MESSAGE_CHUNK"; readonly messageId?: string; readonly role?: string; readonly delta?: string }
  | { readonly type: "TOOL_CALL_START"; readonly toolCallId: string; readonly toolCallName: string; readonly parentMessageId?: string }
  | { readonly type: "TOOL_CALL_ARGS"; readonly toolCallId: string; readonly delta: string }
  | { readonly type: "TOOL_CALL_END"; readonly toolCallId: string }
  | {
      readonly type: "TOOL_CALL_CHUNK";
      readonly toolCallId?: string;
      readonly toolCallName?: string;
      readonly parentMessageId?: string;
      readonly delta?: string;
    }
  | { readonly type: "TOOL_CALL_RESULT"; readonly messageId: string; readonly toolCallId: string; readonly content: unknown }
  | { readonly type: "REASONING_START"; readonly messageId: string }
  | { readonly type: "REASONING_MESSAGE_START"; readonly messageId: string }
  | { readonly type: "REASONING_MESSAGE_CONTENT"; readonly messageId: string; readonly delta: string }
  | { readonly type: "REASONING_MESSAGE_END"; readonly messageId: string }
  | { readonly type: "REASONING_MESSAGE_CHUNK"; readonly messageId?: string; readonly delta?: string }
  | { readonly type: "REASONING_END"; readonly messageId: string }
  | { readonly type: "REASONING_ENCRYPTED_VALUE"; readonly entityId: string; readonly encryptedValue: string }
  | { readonly type: "STATE_SNAPSHOT"; readonly snapshot: unknown }
  | { readonly type: "STATE_DELTA"; readonly delta: readonly PatchOperation[] }
  | { readonly type: "MESSAGES_SNAPSHOT"; readonly messages: readonly SnapshotMessageInput[] }
  | { readonly type: "ACTIVITY_SNAPSHOT"; readonly messageId: string; readonly activityType: string; readonly content: JsonObject; readonly replace?: boolean }
  | { readonly type: "ACTIVITY_DELTA"; readonly messageId: string; readonly activityType: string; readonly patch: readonly PatchOperation[] }
  | { readonly type: "CUSTOM"; readonly name: string; readonly value: unknown }
  | { readonly type: "RAW"; readonly event: unknown }
  | { readonly type: "SUBAGENT_STARTED"; readonly subagentRunId: string; readonly name: string }
  | { readonly type: "SUBAGENT_FINISHED"; readonly subagentRunId: string }
  | { readonly type: "SUBAGENT_ERROR"; readonly subagentRunId: string; readonly message: string };

export type AgUiEventType = AgUiDomainEvent["type"];

/** Events that only append streamed content; everything else is a commit boundary. */
const DELTA_TYPES: ReadonlySet<AgUiEventType> = new Set<AgUiEventType>([
  "TEXT_MESSAGE_CONTENT",
  "TEXT_MESSAGE_CHUNK",
  "TOOL_CALL_ARGS",
  "TOOL_CALL_CHUNK",
  "REASONING_MESSAGE_CONTENT",
  "REASONING_MESSAGE_CHUNK",
]);

export function isDeltaEvent(event: AgUiDomainEvent): boolean {
  return DELTA_TYPES.has(event.type);
}
