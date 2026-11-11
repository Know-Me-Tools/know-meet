/** Small readers for untyped event payloads, shared by the transcript projector. */
import type { MessageRecord, MessageStatus } from "./model.ts";

export const ROLES: ReadonlySet<string> = new Set(["user", "assistant", "system", "developer", "tool", "reasoning", "activity"]);

export function field(source: unknown, key: string): unknown {
  return typeof source === "object" && source !== null ? (source as Readonly<Record<string, unknown>>)[key] : undefined;
}

export function str(source: unknown, key: string): string | undefined {
  const v = field(source, key);
  return typeof v === "string" ? v : undefined;
}

/** AG-UI message content is a string or a list of content parts; only text parts carry text. */
export function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => (str(part, "type") === "text" ? (str(part, "text") ?? "") : "")).join("");
}

/** Settles every streaming message with `status`; returns the changed records. */
export function closeOpen(messages: Map<string, MessageRecord>, status: Exclude<MessageStatus, "streaming">): MessageRecord[] {
  const changed: MessageRecord[] = [];
  for (const [id, m] of messages) {
    if (m.status !== "streaming") continue;
    const next = { ...m, status };
    messages.set(id, next);
    changed.push(next);
  }
  return changed;
}
