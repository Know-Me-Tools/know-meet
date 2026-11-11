/**
 * Minimal AG-UI 1.0 stream ordering rules used to classify the corpus:
 * run boundaries, message/tool/reasoning lifecycles and nothing after the run ends.
 * Returns the indexes of items that violate ordering.
 */
import { EventType } from "@ag-ui/core";

interface OrderingState {
  runOpen: boolean;
  runEnded: boolean;
  openMessages: Set<string>;
  closedMessages: Set<string>;
  openTools: Set<string>;
  closedTools: Set<string>;
  openReasoning: Set<string>;
}

export interface OrderingInput {
  readonly index: number;
  /** Parsed event object, or null when the item has no parsable event (comment-only frame). */
  readonly event: { readonly type: string; readonly [key: string]: unknown } | null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function checkOne(s: OrderingState, e: { readonly type: string; readonly [key: string]: unknown }): boolean {
  const messageId = str(e["messageId"]);
  const toolCallId = str(e["toolCallId"]);
  if (s.runEnded) return false;
  if (e.type === EventType.RUN_STARTED) {
    if (s.runOpen) return false;
    s.runOpen = true;
    return true;
  }
  if (!s.runOpen) return false;
  switch (e.type) {
    case EventType.RUN_FINISHED:
    case EventType.RUN_ERROR:
      s.runEnded = true;
      return true;
    case EventType.TEXT_MESSAGE_START:
      if (messageId === null || s.openMessages.has(messageId) || s.closedMessages.has(messageId)) return false;
      s.openMessages.add(messageId);
      return true;
    case EventType.TEXT_MESSAGE_CONTENT:
      return messageId !== null && s.openMessages.has(messageId);
    case EventType.TEXT_MESSAGE_END:
      if (messageId === null || !s.openMessages.delete(messageId)) return false;
      s.closedMessages.add(messageId);
      return true;
    case EventType.TOOL_CALL_START:
      if (toolCallId === null || s.openTools.has(toolCallId) || s.closedTools.has(toolCallId)) return false;
      s.openTools.add(toolCallId);
      return true;
    case EventType.TOOL_CALL_ARGS:
      return toolCallId !== null && s.openTools.has(toolCallId);
    case EventType.TOOL_CALL_END:
      if (toolCallId === null || !s.openTools.delete(toolCallId)) return false;
      s.closedTools.add(toolCallId);
      return true;
    case EventType.TOOL_CALL_CHUNK:
      if (toolCallId !== null) s.closedTools.add(toolCallId);
      return true;
    case EventType.REASONING_START:
      if (messageId === null) return false;
      s.openReasoning.add(messageId);
      return true;
    case EventType.REASONING_END:
      return messageId !== null && s.openReasoning.delete(messageId);
    default:
      return true;
  }
}

/**
 * Checks one run's items. Ordering is judged only for schema-valid events;
 * schema failures are reported separately by the caller.
 */
export function orderingViolations(items: readonly OrderingInput[]): number[] {
  const state: OrderingState = {
    runOpen: false,
    runEnded: false,
    openMessages: new Set(),
    closedMessages: new Set(),
    openTools: new Set(),
    closedTools: new Set(),
    openReasoning: new Set(),
  };
  const violations: number[] = [];
  for (const item of items) {
    if (item.event === null) continue;
    if (!checkOne(state, item.event)) violations.push(item.index);
  }
  return violations;
}
