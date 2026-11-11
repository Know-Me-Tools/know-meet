/**
 * React access to the session. Durable structure (thread, messages, tool
 * calls, interrupts, parts, activities) is read from the entity graph, the
 * store of record; in-flight streaming text comes from the LiveTextBuffer
 * overlay so token deltas never force a graph commit.
 */
import { useGraphStore } from "@prometheus-ags/entity-graph-react";
import { createContext, use, useCallback, useSyncExternalStore, type ReactNode } from "react";
import type { AgentSession } from "../application/agent-session.ts";
import type { Announcer } from "../application/announcer.ts";
import type { LiveTextBuffer } from "../application/live-text-buffer.ts";
import type { CustomPart, Interrupt, Step, Subagent, ToolCall, TranscriptMessage, RunStatus } from "../domain/transcript-model.ts";
import type { A2uiHost } from "../infrastructure/a2ui-host.ts";
import type { MarkdownPolicy } from "./markdown-policy.ts";
import type { CodeHighlighterPlugin } from "@streamdown/code";
import { ENTITY, THREAD_ID } from "../infrastructure/entity-graph-store.ts";
import type { ReactCatalogComponent } from "@a2ui/react";

export interface SessionServices {
  readonly session: AgentSession;
  readonly live: LiveTextBuffer;
  readonly announcer: Announcer;
  readonly a2ui: A2uiHost<ReactCatalogComponent>;
  readonly allowMediaOrigins: readonly string[];
  readonly markdownPolicy: MarkdownPolicy;
  /** Streamdown code highlighter (the composition root supplies a Worker-backed one). */
  readonly codeHighlighter: CodeHighlighterPlugin;
}

const SessionContext = createContext<SessionServices | null>(null);

export function SessionProvider({ services, children }: { readonly services: SessionServices; readonly children: ReactNode }) {
  return <SessionContext value={services}>{children}</SessionContext>;
}

export function useServices(): SessionServices {
  const services = use(SessionContext);
  if (services === null) throw new Error("SessionProvider is missing");
  return services;
}

export interface ThreadView {
  readonly runStatus: RunStatus;
  readonly runErrorCode: string | null;
  readonly runErrorMessage: string | null;
  readonly messageOrder: readonly string[];
  readonly toolOrder: readonly string[];
  readonly interruptOrder: readonly string[];
  readonly customKeys: readonly string[];
  readonly steps: readonly Step[];
  readonly subagents: readonly Subagent[];
}

const EMPTY_THREAD: ThreadView = {
  runStatus: "idle",
  runErrorCode: null,
  runErrorMessage: null,
  messageOrder: [],
  toolOrder: [],
  interruptOrder: [],
  customKeys: [],
  steps: [],
  subagents: [],
};

/** Graph rows are written from these domain shapes by EntityGraphTranscriptStore. */
function row<T>(value: Record<string, unknown> | undefined): T | undefined {
  return value as T | undefined;
}

export function useThread(): ThreadView {
  return useGraphStore((s) => row<ThreadView>(s.entities[ENTITY.thread]?.[THREAD_ID])) ?? EMPTY_THREAD;
}

export function useMessage(id: string): TranscriptMessage | undefined {
  return useGraphStore((s) => row<TranscriptMessage>(s.entities[ENTITY.message]?.[id]));
}

export function useToolCall(id: string): ToolCall | undefined {
  return useGraphStore((s) => row<ToolCall>(s.entities[ENTITY.toolCall]?.[id]));
}

export function useInterrupt(id: string): Interrupt | undefined {
  return useGraphStore((s) => row<Interrupt>(s.entities[ENTITY.interrupt]?.[id]));
}

export function useCustomPart(key: string): CustomPart | undefined {
  return useGraphStore((s) => row<CustomPart>(s.entities[ENTITY.customPart]?.[key]));
}

/** Ids of tool calls whose parent is `messageId` (stable when unchanged). */
export function useToolIdsFor(messageId: string | null, toolOrder: readonly string[]): readonly string[] {
  const tools = useGraphStore((s) => s.entities[ENTITY.toolCall]);
  return toolOrder.filter((id) => {
    const parent = row<ToolCall>(tools?.[id])?.parentMessageId ?? null;
    return messageId === null ? parent === null : parent === messageId;
  });
}

export function useLiveText(id: string): string | undefined {
  const { live } = useServices();
  const subscribe = useCallback((fn: () => void) => live.subscribe(id, fn), [live, id]);
  return useSyncExternalStore(subscribe, () => live.get(id));
}

export function useAnnouncement(): string {
  const { announcer } = useServices();
  const subscribe = useCallback((fn: () => void) => announcer.subscribe(fn), [announcer]);
  return useSyncExternalStore(subscribe, () => announcer.current());
}

export function useA2uiVersion(): number {
  const { a2ui } = useServices();
  const subscribe = useCallback((fn: () => void) => a2ui.subscribe(fn), [a2ui]);
  return useSyncExternalStore(subscribe, () => a2ui.getVersion());
}
