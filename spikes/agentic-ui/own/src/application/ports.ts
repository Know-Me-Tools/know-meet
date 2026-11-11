/**
 * Ports the application layer depends on. Adapters in infrastructure/ satisfy
 * them; the composition root (presentation/main.tsx) wires them together.
 */
import type { AgUiDomainEvent } from "../domain/agui-event.ts";
import type { ResumeEntry } from "../domain/hitl-machine.ts";
import type { TranscriptState } from "../domain/transcript-model.ts";

/** AG-UI message as sent back to the agent in RunAgentInput.messages. */
export type AgUiInputMessage =
  | { readonly id: string; readonly role: "user"; readonly content: string }
  | {
      readonly id: string;
      readonly role: "assistant";
      readonly content?: string;
      readonly toolCalls?: readonly { readonly id: string; readonly type: "function"; readonly function: { readonly name: string; readonly arguments: string } }[];
    }
  | { readonly id: string; readonly role: "tool"; readonly content: string; readonly toolCallId: string };

export interface RunAgentInputBody {
  readonly threadId: string;
  readonly runId: string;
  readonly messages: readonly AgUiInputMessage[];
  readonly tools: readonly unknown[];
  readonly context: readonly unknown[];
  readonly state: unknown;
  readonly forwardedProps: Readonly<Record<string, unknown>>;
  readonly resume?: readonly ResumeEntry[];
}

export interface StreamSink {
  /** A validated AG-UI event, in wire order. */
  onEvent(event: AgUiDomainEvent): void;
  /** A frame or event the decoder rejected; the stream continues. */
  onProtocolError(code: string, eventType?: string): void;
}

export type TransportOutcome =
  | { readonly kind: "completed" }
  | { readonly kind: "aborted" }
  | { readonly kind: "failed"; readonly message: string };

export interface AgUiTransport {
  /** POSTs the input and streams events into `sink`, reconnecting with Last-Event-ID on network errors. */
  run(body: RunAgentInputBody, sink: StreamSink, signal: AbortSignal): Promise<TransportOutcome>;
}

export type CommitReason = "boundary" | "checkpoint";

/** Durable store of record (entity-graph). One `commit` is one checkpoint transaction. */
/**
 * Render-only overlay for published streaming text, keyed by message id. Values are
 * ephemeral: never durable writes, never persisted (entity-graph live layer in the app).
 */
export interface LiveTextOverlay {
  set(id: string, text: string): void;
  /** Drops the id's text; true when one was held. */
  clear(id: string): boolean;
  get(id: string): string | undefined;
  /** Ids that currently hold text. */
  ids(): string[];
  subscribe(id: string, listener: () => void): () => void;
}

export interface TranscriptStore {
  commit(state: TranscriptState, reason: CommitReason): void;
  /** STATE_SNAPSHOT / STATE_DELTA are projected into the store as they arrive. */
  projectSharedState(event: Extract<AgUiDomainEvent, { type: "STATE_SNAPSHOT" | "STATE_DELTA" }>, before: unknown): void;
  commitCount(): number;
  resetCommitCount(): void;
  snapshot(): unknown;
}

/** A2UI action a rendered surface emits (A2UI v1.0 `action`). */
export interface A2uiUserAction {
  readonly name: string;
  readonly surfaceId: string;
  readonly sourceComponentId: string;
  readonly timestamp: string;
  readonly context: Readonly<Record<string, unknown>>;
}

export interface SurfaceSnapshot {
  readonly surfaceId: string;
  readonly renderedComponentIds: readonly string[];
  readonly fallbackComponentIds: readonly string[];
  readonly dataModel: unknown;
  readonly deleted: boolean;
}

/** Applies A2UI operations carried by activities and reports surface state. */
export interface A2uiSurfaceHost {
  sync(state: TranscriptState): void;
  snapshot(): readonly SurfaceSnapshot[];
}

/** Wall clock and timers. Streamed-text publishing uses PublishClock (publish-scheduler.ts). */
export interface Scheduler {
  now(): number;
  after(ms: number, fn: () => void): () => void;
}
