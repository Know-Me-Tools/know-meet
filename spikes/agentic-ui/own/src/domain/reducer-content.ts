/**
 * Message, reasoning and tool-call slices of the transcript reducer. Every
 * function is pure: it returns the next state or a protocol error code.
 */
import type { MessageRole, MessageStatus, ToolCall, TranscriptMessage, TranscriptState } from "./transcript-model.ts";

export type Step = { readonly ok: true; readonly state: TranscriptState } | { readonly ok: false; readonly code: string };

export const ok = (state: TranscriptState): Step => ({ ok: true, state });
export const bad = (code: string): Step => ({ ok: false, code });

const ROLES: ReadonlySet<string> = new Set(["user", "assistant", "system", "developer", "tool", "reasoning", "activity"]);

export function toRole(role: string | undefined, fallback: MessageRole): MessageRole {
  return role !== undefined && ROLES.has(role) ? (role as MessageRole) : fallback;
}

function putMessage(state: TranscriptState, message: TranscriptMessage): TranscriptState {
  const isNew = !Object.hasOwn(state.messages, message.id);
  return {
    ...state,
    messages: { ...state.messages, [message.id]: message },
    messageOrder: isNew ? [...state.messageOrder, message.id] : state.messageOrder,
  };
}

function putTool(state: TranscriptState, tool: ToolCall): TranscriptState {
  const isNew = !Object.hasOwn(state.toolCalls, tool.id);
  return {
    ...state,
    toolCalls: { ...state.toolCalls, [tool.id]: tool },
    toolOrder: isNew ? [...state.toolOrder, tool.id] : state.toolOrder,
  };
}

export function addMessage(state: TranscriptState, id: string, role: MessageRole, text: string, status: MessageStatus): TranscriptState {
  return putMessage(state, { id, role, text, status, chunkMode: false, encrypted: false });
}

export function startMessage(state: TranscriptState, id: string, role: MessageRole, chunkMode: boolean): Step {
  if (Object.hasOwn(state.messages, id)) return bad("duplicate-message");
  return ok(putMessage(state, { id, role, text: "", status: "streaming", chunkMode, encrypted: false }));
}

export function appendText(state: TranscriptState, id: string, delta: string): Step {
  const message = state.messages[id];
  if (message === undefined) return bad("unknown-message");
  if (message.status !== "streaming") return bad("message-closed");
  return ok(putMessage(state, { ...message, text: message.text + delta }));
}

export function endMessage(state: TranscriptState, id: string): Step {
  const message = state.messages[id];
  if (message === undefined) return bad("unknown-message");
  if (message.status !== "streaming") return bad("message-closed");
  return ok(putMessage(state, { ...message, status: "complete", chunkMode: false }));
}

/** TEXT_MESSAGE_CHUNK / REASONING_MESSAGE_CHUNK: opens the message on first sight, then appends. */
export function chunkMessage(state: TranscriptState, id: string | undefined, role: MessageRole, delta: string | undefined): Step {
  if (id === undefined) return bad("chunk-without-id");
  const existing = state.messages[id];
  let next = state;
  if (existing === undefined) {
    const started = startMessage(state, id, role, true);
    if (!started.ok) return started;
    next = started.state;
  } else if (existing.status !== "streaming" || !existing.chunkMode) {
    return bad("message-closed");
  }
  return delta === undefined || delta === "" ? ok(next) : appendText(next, id, delta);
}

export function markEncrypted(state: TranscriptState, id: string): Step {
  const message = state.messages[id];
  if (message === undefined) return bad("unknown-message");
  return ok(putMessage(state, { ...message, encrypted: true }));
}

/** Closes every streaming message with `status` (run end, cancel, error). */
export function closeOpenMessages(state: TranscriptState, status: MessageStatus): TranscriptState {
  let next = state;
  for (const id of state.messageOrder) {
    const m = next.messages[id];
    if (m?.status === "streaming") next = putMessage(next, { ...m, status, chunkMode: false });
  }
  return next;
}

function parseArgs(text: string): unknown {
  if (text.trim() === "") return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch {
    return text;
  }
}

function finalizeArgs(tool: ToolCall): ToolCall {
  return { ...tool, args: parseArgs(tool.argsText), status: tool.hasResult ? "complete" : "awaiting-result", chunkMode: false };
}

export function startTool(state: TranscriptState, id: string, name: string, parentMessageId: string | undefined, chunkMode: boolean): Step {
  if (Object.hasOwn(state.toolCalls, id)) return bad("duplicate-tool-call");
  const tool: ToolCall = {
    id,
    name,
    argsText: "",
    args: "",
    status: "streaming-args",
    hasResult: false,
    chunkMode,
    ...(parentMessageId === undefined ? {} : { parentMessageId }),
  };
  return ok(putTool(state, tool));
}

export function appendArgs(state: TranscriptState, id: string, delta: string): Step {
  const tool = state.toolCalls[id];
  if (tool === undefined) return bad("unknown-tool-call");
  if (tool.status !== "streaming-args") return bad("tool-call-closed");
  const argsText = tool.argsText + delta;
  return ok(putTool(state, { ...tool, argsText, args: argsText }));
}

export function endTool(state: TranscriptState, id: string): Step {
  const tool = state.toolCalls[id];
  if (tool === undefined) return bad("unknown-tool-call");
  if (tool.status !== "streaming-args") return bad("tool-call-closed");
  return ok(putTool(state, finalizeArgs(tool)));
}

export function chunkTool(state: TranscriptState, id: string | undefined, name: string | undefined, parent: string | undefined, delta: string | undefined): Step {
  if (id === undefined) return bad("chunk-without-id");
  let next = state;
  const existing = state.toolCalls[id];
  if (existing === undefined) {
    if (name === undefined) return bad("chunk-without-name");
    const started = startTool(state, id, name, parent, true);
    if (!started.ok) return started;
    next = started.state;
  } else if (existing.status !== "streaming-args" || !existing.chunkMode) {
    return bad("tool-call-closed");
  }
  return delta === undefined || delta === "" ? ok(next) : appendArgs(next, id, delta);
}

const KEEP_ON_RESULT: ReadonlySet<string> = new Set(["rejected", "expired", "error"]);

export function toolResult(state: TranscriptState, id: string, content: unknown): Step {
  const tool = state.toolCalls[id];
  if (tool === undefined) return bad("unknown-tool-call");
  const base = tool.status === "streaming-args" ? finalizeArgs(tool) : tool;
  const status = KEEP_ON_RESULT.has(base.status) ? base.status : "complete";
  return ok(putTool(state, { ...base, hasResult: true, result: content, status }));
}

export function setToolStatus(state: TranscriptState, id: string, status: ToolCall["status"]): TranscriptState {
  const tool = state.toolCalls[id];
  return tool === undefined || tool.status === status ? state : putTool(state, { ...tool, status });
}

/** Closes chunk-opened messages and tool calls when a different kind of event arrives. */
export function closeChunks(state: TranscriptState, keepTextChunks: boolean, keepToolChunks: boolean): TranscriptState {
  let next = state;
  if (!keepTextChunks) {
    for (const id of state.messageOrder) {
      const m = next.messages[id];
      if (m?.chunkMode === true && m.status === "streaming") next = putMessage(next, { ...m, status: "complete", chunkMode: false });
    }
  }
  if (!keepToolChunks) {
    for (const id of state.toolOrder) {
      const t = next.toolCalls[id];
      if (t?.chunkMode === true && t.status === "streaming-args") next = putTool(next, finalizeArgs(t));
    }
  }
  return next;
}

/** Tool calls still receiving arguments when the run ends become errors. */
export function failOpenTools(state: TranscriptState): TranscriptState {
  let next = state;
  for (const id of state.toolOrder) {
    if (next.toolCalls[id]?.status === "streaming-args") next = setToolStatus(next, id, "error");
  }
  return next;
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: unknown) => (typeof part === "object" && part !== null && (part as { type?: unknown }).type === "text" ? String((part as { text?: unknown }).text ?? "") : ""))
    .join("");
}
