/**
 * The transcript, rendered with assistant-ui primitives (ThreadPrimitive / MessagePrimitive) and
 * the Know Meet presentation components. This file and assistant-ui-session.tsx are the only
 * places that know about assistant-ui; swapping the runtime means replacing these two.
 */
import { Profiler, useCallback, type ProfilerOnRenderCallback } from "react";
import { MessagePrimitive, ThreadPrimitive, useAuiState, type DataMessagePartProps, type ToolCallMessagePartProps } from "@assistant-ui/react";
import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { code } from "@streamdown/code";
import { createMathPlugin } from "@streamdown/math";
import { defaultRehypePlugins } from "streamdown";
import type { MessageStatus } from "../../domain/transcript/model.ts";
import { FENCES_BY_LANGUAGE, MARKDOWN_COMPONENTS, MarkdownMediaPolicy } from "../../presentation/markdown/markdown-components.tsx";
import { ApprovalCard } from "../../presentation/parts/approval-card.tsx";
import { KmCustomPart } from "../../presentation/parts/custom-part.tsx";
import { ToolCallCard } from "../../presentation/parts/tool-call-card.tsx";
import { useChatSession, useServices, useSessionRead } from "../../presentation/session-context.tsx";
import { A2uiSurfaces } from "../../presentation/transcript/a2ui-surfaces.tsx";
import { Composer } from "../../presentation/transcript/composer.tsx";
import { MessageFrame } from "../../presentation/transcript/message-frame.tsx";
import { LiveRegion, RunErrorAlert } from "../../presentation/transcript/status-regions.tsx";

const PLUGINS = { code, math: createMathPlugin({ singleDollarTextMath: true }) };
/** Streamdown's sanitize + harden without rehype-raw: raw HTML in a reply never becomes DOM. */
const REHYPE = [defaultRehypePlugins["sanitize"], defaultRehypePlugins["harden"]].filter((p) => p !== undefined);

function MarkdownText() {
  return (
    <StreamdownTextPrimitive
      plugins={PLUGINS}
      components={MARKDOWN_COMPONENTS}
      componentsByLanguage={FENCES_BY_LANGUAGE}
      rehypePlugins={REHYPE}
      skipHtml
      defer
      controls={false}
      shikiTheme={["github-dark", "github-dark"]}
    />
  );
}

function ToolCall(part: ToolCallMessagePartProps) {
  const session = useChatSession();
  if (part.toolName === "present" && part.toolCallId.startsWith("a2ui:")) return null; // A2UI renders from the A2UI host
  const approval = part.approval;
  // assistant-ui's approval seam sends resume [{ interruptId, status: "resolved", payload: { approved } }].
  const onDecide = (approved: boolean) => {
    if (approval !== undefined) session.decide(approval.id, approved, (ok) => part.respondToApproval({ approved: ok }));
  };
  return (
    <ToolCallCard toolCallId={part.toolCallId} toolName={part.toolName} argsText={part.argsText}>
      {approval === undefined ? null : (
        <ApprovalCard interruptId={approval.id} title={`Allow ${part.toolName.replaceAll("_", " ")}?`} {...(approval.prompt === undefined ? {} : { detail: approval.prompt })} onDecide={onDecide} />
      )}
    </ToolCallCard>
  );
}

function DataPart({ name, data }: DataMessagePartProps) {
  return <KmCustomPart name={name} value={data} />;
}

const PART_COMPONENTS = {
  Text: MarkdownText,
  Reasoning: () => null,
  tools: { Fallback: ToolCall },
  data: { Fallback: DataPart },
};

function toStatus(type: string, reason: string | undefined): MessageStatus {
  if (type === "running") return "streaming";
  if (type === "incomplete") return reason === "cancelled" ? "cancelled" : "error";
  return "complete";
}

function UserMessage() {
  const id = useAuiState((s) => s.message.id);
  return (
    <MessageFrame messageId={id} role="user" status="complete">
      <MessagePrimitive.Parts />
    </MessageFrame>
  );
}

function AssistantMessage() {
  const id = useAuiState((s) => s.message.id);
  const type = useAuiState((s) => s.message.status?.type ?? "complete");
  const reason = useAuiState((s) => (s.message.status?.type === "incomplete" ? s.message.status.reason : undefined));
  return (
    <MessageFrame messageId={id} role="assistant" status={toStatus(type, reason)}>
      <MessagePrimitive.Parts components={PART_COMPONENTS} />
    </MessageFrame>
  );
}

const MESSAGE_COMPONENTS = { UserMessage, AssistantMessage };
const selectBusy = (r: { runStatus(): string }) => r.runStatus() === "running";

export function TranscriptView() {
  const services = useServices();
  const busy = useSessionRead(selectBusy);
  const onRender = useCallback<ProfilerOnRenderCallback>(() => {
    services.renders.commits += 1;
  }, [services]);
  return (
    <ThreadPrimitive.Root className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-s4 px-s4 py-s5">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-xl font-semibold tracking-heading text-fg">Meeting assistant</h1>
        <p className="text-xs text-fg-sub">Prototype H: assistant-ui runtime, entity-graph store</p>
      </header>
      <MarkdownMediaPolicy value={services.allowedMediaOrigins}>
        <Profiler id="km-transcript" onRender={onRender}>
          <main data-testid="km-transcript" aria-busy={busy ? "true" : undefined} aria-label="Conversation" className="flex flex-1 flex-col gap-s5">
            <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
            <A2uiSurfaces />
            <RunErrorAlert />
          </main>
        </Profiler>
      </MarkdownMediaPolicy>
      <Composer />
      <LiveRegion />
    </ThreadPrimitive.Root>
  );
}
