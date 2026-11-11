/** Builds the AG-UI RunAgentInput for a new run from the transcript. */
import type { ResumeEntry } from "../domain/hitl-machine.ts";
import type { ToolCall, TranscriptState } from "../domain/transcript-model.ts";
import type { AgUiInputMessage, RunAgentInputBody } from "./ports.ts";

export interface RunOptions {
  readonly runId: string;
  readonly resume?: readonly ResumeEntry[];
  readonly forwardedProps?: Readonly<Record<string, unknown>>;
}

function resultText(result: unknown): string {
  return typeof result === "string" ? result : JSON.stringify(result ?? null);
}

export function toInputMessages(state: TranscriptState): AgUiInputMessage[] {
  const out: AgUiInputMessage[] = [];
  for (const id of state.messageOrder) {
    const m = state.messages[id];
    if (m === undefined) continue;
    if (m.role === "user") out.push({ id, role: "user", content: m.text });
    if (m.role !== "assistant") continue;
    const calls = state.toolOrder.map((t) => state.toolCalls[t]).filter((t): t is ToolCall => t !== undefined && t.parentMessageId === id);
    const toolCalls = calls.map((t) => ({ id: t.id, type: "function" as const, function: { name: t.name, arguments: t.argsText } }));
    out.push({ id, role: "assistant", content: m.text, ...(toolCalls.length > 0 ? { toolCalls } : {}) });
    for (const t of calls) {
      if (t.hasResult) out.push({ id: `tool-result-${t.id}`, role: "tool", content: resultText(t.result), toolCallId: t.id });
    }
  }
  return out;
}

export function buildRunInput(state: TranscriptState, options: RunOptions): RunAgentInputBody {
  return {
    threadId: state.threadId ?? "thread",
    runId: options.runId,
    messages: toInputMessages(state),
    tools: [],
    context: [],
    state: state.state ?? {},
    forwardedProps: options.forwardedProps ?? {},
    ...(options.resume === undefined ? {} : { resume: options.resume }),
  };
}
