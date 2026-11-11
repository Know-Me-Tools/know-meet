/** Tool call card (AI Elements "Tool" pattern): name, status, arguments, result, and its approval card. */
import { useGraphStore } from "@prometheus-ags/entity-graph-react";
import type { Interrupt, ToolCallStatus } from "../domain/transcript-model.ts";
import { ENTITY } from "../infrastructure/entity-graph-store.ts";
import { ApprovalCard } from "./approval-card.tsx";
import { useThread, useToolCall } from "./session-context.tsx";
import { Badge, type BadgeTone } from "./ui/badge.tsx";
import { Card, CardHeader, CardTitle } from "./ui/card.tsx";

const STATUS: Readonly<Record<ToolCallStatus, { readonly text: string; readonly tone: BadgeTone }>> = {
  "streaming-args": { text: "Preparing", tone: "info" },
  "awaiting-result": { text: "Running", tone: "info" },
  "pending-approval": { text: "Needs approval", tone: "warning" },
  approved: { text: "Approved", tone: "success" },
  rejected: { text: "Rejected", tone: "danger" },
  expired: { text: "Expired", tone: "neutral" },
  complete: { text: "Done", tone: "success" },
  error: { text: "Failed", tone: "danger" },
};

function pretty(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? "";
}

/** Interrupt ids gating this tool call, as a stable string for the selector. */
function useInterruptIdsFor(toolCallId: string, order: readonly string[]): string[] {
  const joined = useGraphStore((s) => {
    const rows = s.entities[ENTITY.interrupt];
    return order.filter((id) => (rows?.[id] as Interrupt | undefined)?.toolCallId === toolCallId).join("\u0000");
  });
  return joined === "" ? [] : joined.split("\u0000");
}

export function ToolCallCard({ toolCallId }: { readonly toolCallId: string }) {
  const tool = useToolCall(toolCallId);
  const thread = useThread();
  const interruptIds = useInterruptIdsFor(toolCallId, thread.interruptOrder);
  if (tool === undefined) return null;
  const status = STATUS[tool.status];
  return (
    <Card data-testid="km-tool-call" data-tool-call-id={toolCallId} data-status={tool.status} className="gap-2 bg-surface">
      <CardHeader>
        <CardTitle className="font-mono text-13">{tool.name}</CardTitle>
        <Badge tone={status.tone}>{status.text}</Badge>
      </CardHeader>
      {tool.status === "streaming-args" ? null : (
        <details className="text-13 text-fg-sub">
          <summary className="cursor-pointer">Arguments</summary>
          <pre className="km-code mt-1">{pretty(tool.args)}</pre>
        </details>
      )}
      {tool.hasResult ? (
        <details className="text-13 text-fg-sub">
          <summary className="cursor-pointer">Result</summary>
          <pre className="km-code mt-1">{pretty(tool.result)}</pre>
        </details>
      ) : null}
      {interruptIds.map((id) => (
        <ApprovalCard key={id} interruptId={id} />
      ))}
    </Card>
  );
}
