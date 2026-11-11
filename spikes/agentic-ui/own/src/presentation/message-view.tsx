/**
 * One transcript message (AI Elements "Message" pattern). Text comes from the
 * entity graph, overlaid by the live streaming buffer while the message
 * streams. Custom parts and tool calls attach to their parent message.
 */
import { useGraphStore } from "@prometheus-ags/entity-graph-react";
import { memo } from "react";
import type { CustomPart, TranscriptMessage } from "../domain/transcript-model.ts";
import { ENTITY } from "../infrastructure/entity-graph-store.ts";
import { A2uiActivityView } from "./a2ui/surface-view.tsx";
import { Markdown } from "./markdown.tsx";
import { CustomPartView } from "./parts/custom-part-view.tsx";
import { countRender } from "./render-counter.ts";
import { useCustomPart, useLiveText, useMessage, useServices, useThread, useToolIdsFor } from "./session-context.tsx";
import { ToolCallCard } from "./tool-call-card.tsx";
import { cn } from "./ui/cn.ts";

const STATUS_NOTE: Partial<Record<TranscriptMessage["status"], string>> = {
  cancelled: "Stopped before the answer was complete.",
  error: "This answer was interrupted by an error.",
};

/** Keys of custom parts attached to `messageId` (null: parts with no matching message). */
export function useCustomKeysFor(messageId: string | null, keys: readonly string[], messageOrder: readonly string[]): string[] {
  const joined = useGraphStore((s) => {
    const rows = s.entities[ENTITY.customPart];
    return keys
      .filter((k) => {
        const owner = (rows?.[k] as CustomPart | undefined)?.messageId;
        return messageId === null ? owner === undefined || !messageOrder.includes(owner) : owner === messageId;
      })
      .join("\u0000");
  });
  return joined === "" ? [] : joined.split("\u0000");
}

function PartByKey({ partKey }: { readonly partKey: string }) {
  const part = useCustomPart(partKey);
  return part === undefined ? null : <CustomPartView part={part} />;
}

export function PartList({ keys }: { readonly keys: readonly string[] }) {
  if (keys.length === 0) return null;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {keys.map((k) => (
        <PartByKey key={k} partKey={k} />
      ))}
    </div>
  );
}

function Body({ message, text }: { readonly message: TranscriptMessage; readonly text: string }) {
  const { markdownPolicy } = useServices();
  const streaming = message.status === "streaming";
  if (message.role === "user") return <p className="whitespace-pre-wrap text-sm text-fg">{text}</p>;
  if (message.role === "reasoning") {
    return (
      <details className="text-13 text-fg-sub">
        <summary className="cursor-pointer">Reasoning</summary>
        {message.encrypted ? <p>The reasoning for this step is encrypted and not shown.</p> : <Markdown text={text} streaming={streaming} policy={markdownPolicy} />}
      </details>
    );
  }
  return <Markdown text={text} streaming={streaming} policy={markdownPolicy} />;
}

export const MessageView = memo(function MessageView({ id }: { readonly id: string }) {
  countRender("MessageView");
  const message = useMessage(id);
  const live = useLiveText(id);
  const thread = useThread();
  const toolIds = useToolIdsFor(id, thread.toolOrder);
  const partKeys = useCustomKeysFor(id, thread.customKeys, thread.messageOrder);
  if (message === undefined) return null;
  if (message.role === "activity") return <A2uiActivityView activityId={id} />;
  if (message.role === "tool" || message.role === "system" || message.role === "developer") return null;
  const text = live !== undefined && live.length >= message.text.length ? live : message.text;
  const isUser = message.role === "user";
  const note = STATUS_NOTE[message.status];
  return (
    <article
      data-testid="km-message"
      data-message-id={id}
      data-role={message.role}
      data-status={message.status}
      aria-label={isUser ? "You said" : message.role === "reasoning" ? "Assistant reasoning" : "Assistant"}
      className={cn("flex flex-col gap-3 rounded-lg p-4", isUser ? "ml-auto max-w-[80%] bg-muted" : "bg-bg-2")}
    >
      {text === "" && message.status === "streaming" ? <p className="text-13 text-fg-sub">Thinking…</p> : <Body message={message} text={text} />}
      <PartList keys={partKeys} />
      {toolIds.map((toolId) => (
        <ToolCallCard key={toolId} toolCallId={toolId} />
      ))}
      {note === undefined ? null : <p className="text-13 text-amber-text">{note}</p>}
    </article>
  );
});
