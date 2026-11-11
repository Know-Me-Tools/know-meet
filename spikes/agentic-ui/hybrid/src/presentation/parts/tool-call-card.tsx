/** One tool call (shadcn AI Elements "Tool" pattern on Know Meet tokens). Status from the durable store. */
import { useCallback, type ReactNode } from "react";
import { useServices, useSessionRead } from "../session-context.tsx";

export interface ToolCallCardProps {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly argsText: string;
  readonly children?: ReactNode;
}

const LABELS: Readonly<Record<string, string>> = {
  "streaming-args": "Preparing",
  "awaiting-result": "Running",
  "pending-approval": "Needs approval",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
  complete: "Done",
  error: "Failed",
};

function prettyArgs(argsText: string): string {
  try {
    return JSON.stringify(JSON.parse(argsText), null, 2);
  } catch {
    return argsText;
  }
}

export function ToolCallCard({ toolCallId, toolName, argsText, children }: ToolCallCardProps) {
  const { renders } = useServices();
  const status = useSessionRead(useCallback((r) => r.toolCallStatus(toolCallId) ?? "streaming-args", [toolCallId]));
  renders.component("ToolCallCard");
  return (
    <section data-testid="km-tool-call" data-tool-call-id={toolCallId} data-status={status} aria-label={`Tool ${toolName}`} className="my-s2 rounded-base bg-card p-s3">
      <header className="flex items-center justify-between gap-s3">
        <span className="font-mono text-13 font-medium text-fg">{toolName}</span>
        <span className="rounded-pill bg-muted px-s2 py-[2px] text-11 font-medium text-fg-sub">{LABELS[status] ?? status}</span>
      </header>
      {argsText === "" ? null : (
        <pre className="mt-s2 rounded-8 bg-bg-2 p-s2 font-mono text-11 whitespace-pre-wrap break-words text-fg-sub"><code>{prettyArgs(argsText)}</code></pre>
      )}
      {children}
    </section>
  );
}
