/**
 * The transcript (AI Elements "Conversation" pattern). aria-busy while a run
 * streams; the streaming text is never inside a live region; a run error is
 * a role="alert" inside the transcript.
 */
import { Profiler } from "react";
import { MessageView, PartList, useCustomKeysFor } from "./message-view.tsx";
import { onTranscriptRender } from "./render-counter.ts";
import { useThread, useToolIdsFor } from "./session-context.tsx";
import { ToolCallCard } from "./tool-call-card.tsx";

function Orphans() {
  const thread = useThread();
  const toolIds = useToolIdsFor(null, thread.toolOrder);
  const partKeys = useCustomKeysFor(null, thread.customKeys, thread.messageOrder);
  if (toolIds.length === 0 && partKeys.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <PartList keys={partKeys} />
      {toolIds.map((id) => (
        <ToolCallCard key={id} toolCallId={id} />
      ))}
    </div>
  );
}

function Activity() {
  const thread = useThread();
  const running = thread.subagents.filter((s) => s.status === "running").length;
  if (thread.steps.length === 0 && thread.subagents.length === 0) return null;
  return (
    <p className="text-xs text-fg-sub">
      {thread.steps.map((s) => `${s.name}: ${s.status}`).join(" · ")}
      {thread.subagents.length > 0 ? ` · ${thread.subagents.length} helper agents (${running} working)` : ""}
    </p>
  );
}

export function Transcript() {
  const thread = useThread();
  const running = thread.runStatus === "running";
  return (
    <Profiler id="transcript" onRender={onTranscriptRender}>
      <section data-testid="km-transcript" aria-label="Conversation" aria-busy={running ? "true" : undefined} className="flex flex-col gap-4">
        {thread.messageOrder.length === 0 ? <p className="text-sm text-fg-sub">Ask the Concierge about your meeting.</p> : null}
        {thread.messageOrder.map((id) => (
          <MessageView key={id} id={id} />
        ))}
        <Orphans />
        <Activity />
        {thread.runStatus === "error" ? (
          <div role="alert" className="rounded-lg bg-red-soft p-3 text-sm text-red-text">
            The assistant hit an error{thread.runErrorCode === null ? "" : ` (${thread.runErrorCode})`}: {thread.runErrorMessage ?? "unknown error"}
          </div>
        ) : null}
      </section>
    </Profiler>
  );
}
