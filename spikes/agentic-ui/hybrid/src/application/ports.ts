/**
 * Ports the application layer depends on. Infrastructure implements them (entity-graph store,
 * the AG-UI transport, the assistant-ui runtime); presentation only sees `ChatSession`.
 */
import type { DirtyEntity } from "../domain/transcript/projector.ts";
import type { InterruptRecord, RunStatus, ToolCallStatus } from "../domain/transcript/model.ts";

/** One append-only journal entry. `id` is deterministic, so a replayed frame is not appended twice. */
export interface JournalEntry {
  readonly id: string;
  readonly seq: number;
  readonly source: "server" | "client" | "protocol-error";
  readonly payload: unknown;
}

/** The durable canonical store (entity-graph). Each commit is one transaction. */
export interface DurableStore {
  commit(entities: readonly DirtyEntity[], journal: readonly JournalEntry[], checkpointId: string): void;
  commits(): number;
  resetCommits(): void;
  dump(): unknown;
}

/**
 * The Know Meet presentation port. Presentation components talk to the chat runtime only through
 * this interface, so assistant-ui can be swapped for another runtime without touching them.
 */
export interface ChatSession {
  send(text: string): void;
  cancel(): void;
  /**
   * Records an approval decision and sends it. `respond` is the runtime's own approval seam for the
   * part (assistant-ui: `respondToApproval`); without it the adapter submits the resume directly.
   */
  decide(interruptId: string, approved: boolean, respond?: (approved: boolean) => Promise<void>): void;
  sendA2uiAction(action: Readonly<Record<string, unknown>>): void;
}

/** Read model the presentation subscribes to (backed by the durable store). */
export interface SessionReadModel {
  runStatus(): RunStatus;
  runError(): { readonly code?: string; readonly message?: string } | null;
  interrupt(id: string): InterruptRecord | undefined;
  interruptForToolCall(toolCallId: string): InterruptRecord | undefined;
  toolCallStatus(toolCallId: string): ToolCallStatus | undefined;
  subscribe(listener: () => void): () => void;
}
