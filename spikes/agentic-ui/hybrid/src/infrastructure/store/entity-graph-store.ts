/**
 * entity-graph as the durable canonical store. One graph transaction per checkpoint: changed
 * transcript entities are upserted under deterministic ids and the journal entries since the last
 * checkpoint are written as one `km.journalSegment` entity, so re-applying a checkpoint is a no-op.
 * The same graph backs the read model the presentation subscribes to (approval cards, run state).
 */
import { applyJsonPatch, createGraphStore, createGraphTransaction, type JsonPatchOp } from "@prometheus-ags/entity-graph-core";
import type { DurableStore, JournalEntry, SessionReadModel } from "../../application/ports.ts";
import type { DirtyEntity } from "../../domain/transcript/projector.ts";
import { ENTITY, type InterruptRecord, type RunRecord, type RunStatus, type ToolCallRecord, type ToolCallStatus } from "../../domain/transcript/model.ts";

type Graph = ReturnType<typeof createGraphStore>;

export class EntityGraphStore implements DurableStore, SessionReadModel {
  readonly graph: Graph = createGraphStore();
  private commitCount = 0;

  commit(entities: readonly DirtyEntity[], journal: readonly JournalEntry[], checkpointId: string): void {
    const tx = createGraphTransaction(this.graph);
    for (const e of entities) {
      if (e.record["deleted"] === true) tx.removeEntity(e.kind, e.id);
      else tx.replaceEntity(e.kind, e.id, { ...e.record });
    }
    if (journal.length > 0) {
      tx.replaceEntity(ENTITY.journalSegment, checkpointId, {
        id: checkpointId,
        firstSeq: journal[0]?.seq ?? 0,
        lastSeq: journal.at(-1)?.seq ?? 0,
        entries: journal.map((j) => ({ id: j.id, seq: j.seq, source: j.source, payload: j.payload })),
      });
    }
    tx.commit();
    this.commitCount += 1;
  }

  commits(): number {
    return this.commitCount;
  }

  resetCommits(): void {
    this.commitCount = 0;
  }

  dump(): unknown {
    const entities = this.graph.getState().entities;
    const counts = Object.fromEntries(Object.entries(entities).map(([type, byId]) => [type, Object.keys(byId).length]));
    const { [ENTITY.journalSegment]: _journal, ...rest } = entities;
    return { counts, entities: rest };
  }

  runStatus(): RunStatus {
    return this.read<RunRecord>(ENTITY.run, "current")?.status ?? "idle";
  }

  runError(): { readonly code?: string; readonly message?: string } | null {
    const run = this.read<RunRecord>(ENTITY.run, "current");
    if (run?.status !== "error") return null;
    return { ...(run.errorCode === undefined ? {} : { code: run.errorCode }), ...(run.errorMessage === undefined ? {} : { message: run.errorMessage }) };
  }

  interrupt(id: string): InterruptRecord | undefined {
    return this.read<InterruptRecord>(ENTITY.interrupt, id);
  }

  interruptForToolCall(toolCallId: string): InterruptRecord | undefined {
    const all = this.graph.getState().entities[ENTITY.interrupt] ?? {};
    return Object.values(all).find((i) => i["toolCallId"] === toolCallId) as InterruptRecord | undefined;
  }

  toolCallStatus(toolCallId: string): ToolCallStatus | undefined {
    return this.read<ToolCallRecord>(ENTITY.toolCall, toolCallId)?.status;
  }

  subscribe(listener: () => void): () => void {
    return this.graph.subscribe(listener);
  }

  private read<T>(type: string, id: string): T | undefined {
    return (this.graph.getState().readEntity<T>(type, id) ?? undefined) as T | undefined;
  }
}

/** RFC 6902 patcher for STATE_DELTA / ACTIVITY_DELTA, from entity-graph's AG-UI support. */
export function jsonPatch(document: unknown, operations: readonly unknown[]): unknown {
  return applyJsonPatch(document, operations as readonly JsonPatchOp[]);
}
