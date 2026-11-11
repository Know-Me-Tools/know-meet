/**
 * TranscriptStore on @prometheus-ags/entity-graph-core 4.3.0 (the store of
 * record). Each commit diffs the immutable transcript against the last
 * committed one by reference and writes only changed entities, one
 * `upsertEntities` per entity type. Shared agent state goes through the
 * package's AG-UI bridge (applyAgUiSnapshot / applyAgUiDelta).
 */
import { applyAgUiDelta, applyAgUiSnapshot, graphStore, type AgUiStateMapping } from "@prometheus-ags/entity-graph-core";
import type { CommitReason, TranscriptStore } from "../application/ports.ts";
import type { AgUiDomainEvent } from "../domain/agui-event.ts";
import type { TranscriptState } from "../domain/transcript-model.ts";

export const ENTITY = {
  thread: "KmThread",
  message: "KmMessage",
  toolCall: "KmToolCall",
  interrupt: "KmInterrupt",
  customPart: "KmCustomPart",
  activity: "KmActivity",
} as const;

export const THREAD_ID = "thread";

/** Agenda items and counters in the agent's shared state become entities. */
const SHARED_STATE_MAPPINGS: AgUiStateMapping[] = [
  { entityType: "KmAgendaItem", pointer: "/agenda", kind: "collection", idField: "id" },
  { entityType: "KmCounters", pointer: "/counters", kind: "single", constantId: "counters", write: "replace" },
];

type Row = { id: string; data: Record<string, unknown> };

function toRow(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value));
}

function changed<T extends object>(ids: readonly string[], next: Readonly<Record<string, T>>, prev: Readonly<Record<string, T>> | undefined): Row[] {
  const rows: Row[] = [];
  for (const id of ids) {
    const value = next[id];
    if (value !== undefined && value !== prev?.[id]) rows.push({ id, data: toRow(value) });
  }
  return rows;
}

function removed(prevIds: readonly string[] | undefined, next: Readonly<Record<string, unknown>>): string[] {
  return (prevIds ?? []).filter((id) => !Object.hasOwn(next, id));
}

function threadRow(state: TranscriptState): Row {
  return {
    id: THREAD_ID,
    data: {
      runStatus: state.runStatus,
      runErrorCode: state.runErrorCode ?? null,
      runErrorMessage: state.runErrorMessage ?? null,
      messageOrder: state.messageOrder,
      toolOrder: state.toolOrder,
      interruptOrder: state.interruptOrder,
      customKeys: state.customParts.map((p) => p.key),
      activityOrder: state.activityOrder,
      steps: state.steps,
      subagents: state.subagents,
      protocolErrorCount: state.protocolErrors.length,
    },
  };
}

function threadChanged(next: TranscriptState, prev: TranscriptState | null): boolean {
  if (prev === null) return true;
  return (
    next.runStatus !== prev.runStatus ||
    next.runErrorCode !== prev.runErrorCode ||
    next.messageOrder !== prev.messageOrder ||
    next.toolOrder !== prev.toolOrder ||
    next.interruptOrder !== prev.interruptOrder ||
    next.customParts !== prev.customParts ||
    next.activityOrder !== prev.activityOrder ||
    next.steps !== prev.steps ||
    next.subagents !== prev.subagents ||
    next.protocolErrors.length !== prev.protocolErrors.length
  );
}

export class EntityGraphTranscriptStore implements TranscriptStore {
  private last: TranscriptState | null = null;
  private commits = 0;
  private readonly reasons: Record<CommitReason, number> = { boundary: 0, checkpoint: 0 };

  commit(state: TranscriptState, reason: CommitReason): void {
    const prev = this.last;
    if (prev === state) return;
    const writes: [string, Row[]][] = [
      [ENTITY.message, changed(state.messageOrder, state.messages, prev?.messages)],
      [ENTITY.toolCall, changed(state.toolOrder, state.toolCalls, prev?.toolCalls)],
      [ENTITY.interrupt, changed(state.interruptOrder, state.interrupts, prev?.interrupts)],
      [ENTITY.activity, changed(state.activityOrder, state.activities, prev?.activities)],
      [ENTITY.customPart, state.customParts.filter((p, i) => p !== prev?.customParts[i]).map((p) => ({ id: p.key, data: toRow(p) }))],
      [ENTITY.thread, threadChanged(state, prev) ? [threadRow(state)] : []],
    ];
    const deletions = removed(prev?.messageOrder, state.messages);
    this.last = state;
    if (deletions.length === 0 && writes.every(([, rows]) => rows.length === 0)) return;
    const api = graphStore.getState();
    for (const id of deletions) api.removeEntity(ENTITY.message, id);
    for (const [type, rows] of writes) if (rows.length > 0) api.upsertEntities(type, rows);
    this.commits += 1;
    this.reasons[reason] += 1;
  }

  projectSharedState(event: Extract<AgUiDomainEvent, { type: "STATE_SNAPSHOT" | "STATE_DELTA" }>, before: unknown): void {
    if (event.type === "STATE_SNAPSHOT") {
      if (typeof event.snapshot !== "object" || event.snapshot === null) return;
      applyAgUiSnapshot({ snapshot: { ...(event.snapshot as Record<string, unknown>) } }, { mappings: SHARED_STATE_MAPPINGS });
    } else {
      const base = typeof before === "object" && before !== null ? { ...(before as Record<string, unknown>) } : {};
      applyAgUiDelta({ delta: event.delta.map((op) => ({ ...op })) }, { mappings: SHARED_STATE_MAPPINGS }, base);
    }
    this.commits += 1;
  }

  commitCount(): number {
    return this.commits;
  }

  resetCommitCount(): void {
    this.commits = 0;
    this.reasons.boundary = 0;
    this.reasons.checkpoint = 0;
  }

  snapshot(): unknown {
    return { commitsByReason: { ...this.reasons }, entities: graphStore.getState().entities };
  }
}
