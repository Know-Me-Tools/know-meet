/**
 * The adapter contract every prototype exposes as `window.__spike`.
 * See contract.md for semantics. Prototypes may import these types by
 * relative path; they must not import anything else from the harness.
 */

export type SpikePrototypeId = "hybrid" | "own";

export type RunStatus = "idle" | "running" | "finished" | "interrupted" | "cancelled" | "error";

export type MessageStatus = "streaming" | "complete" | "cancelled" | "error";

export type ToolCallStatus =
  | "streaming-args"
  | "awaiting-result"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "expired"
  | "complete"
  | "error";

export type InterruptStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface SnapshotMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system" | "developer" | "tool" | "reasoning" | "activity";
  /** Raw accumulated text (markdown source), not rendered HTML. */
  readonly text: string;
  readonly status: MessageStatus;
}

export interface SnapshotToolCall {
  readonly id: string;
  readonly name: string;
  /** Parsed JSON arguments once complete; raw string while streaming or if unparsable. */
  readonly args: unknown;
  readonly status: ToolCallStatus;
  /** TOOL_CALL_RESULT content as received (string or content parts). */
  readonly result?: unknown;
  readonly parentMessageId?: string;
}

export interface SnapshotInterrupt {
  readonly id: string;
  readonly reason: string;
  readonly toolCallId?: string;
  readonly status: InterruptStatus;
}

export interface SnapshotCustomPart {
  /** CUSTOM event name, e.g. "km.citation". */
  readonly name: string;
  /** How it rendered: a known renderer, the neutral fallback, or not at all (blocked). */
  readonly rendering: "renderer" | "fallback" | "blocked";
  /** Stable id from the value (citationId, mediaId, diagramId) when present. */
  readonly partId?: string;
}

export interface SnapshotA2uiSurface {
  readonly surfaceId: string;
  /** Component ids currently rendered (including fallback-rendered unknown components). */
  readonly renderedComponentIds: readonly string[];
  /** Component ids rendered with the unknown-component fallback. */
  readonly fallbackComponentIds: readonly string[];
  readonly dataModel: unknown;
  readonly deleted: boolean;
}

export interface SnapshotProtocolError {
  /** Short machine code chosen by the prototype, e.g. "invalid-json", "unknown-message". */
  readonly code: string;
  /** AG-UI event type involved, when known. */
  readonly eventType?: string;
}

/** Normalised transcript model the checks compare with `expected`. */
export interface SpikeSnapshot {
  readonly threadId: string | null;
  readonly runStatus: RunStatus;
  readonly runErrorCode?: string;
  readonly messages: readonly SnapshotMessage[];
  readonly toolCalls: readonly SnapshotToolCall[];
  readonly interrupts: readonly SnapshotInterrupt[];
  /** Current AG-UI shared state (after STATE_SNAPSHOT / STATE_DELTA). */
  readonly state: unknown;
  readonly customParts: readonly SnapshotCustomPart[];
  readonly a2uiSurfaces: readonly SnapshotA2uiSurface[];
  readonly activities: readonly { readonly messageId: string; readonly activityType: string }[];
  readonly steps: readonly { readonly name: string; readonly status: "running" | "finished" }[];
  readonly subagents: readonly { readonly subagentRunId: string; readonly name: string; readonly status: "running" | "finished" | "error" }[];
  readonly protocolErrors: readonly SnapshotProtocolError[];
}

export interface RenderCounts {
  /** React commits (Profiler onRender calls) since the last reset. */
  readonly commits: number;
  /** Per-component render counts keyed by a stable component name. */
  readonly byComponent: Readonly<Record<string, number>>;
  /**
   * Writes committed to the durable store (entity-graph transactions, journal
   * appends or checkpoints) since the last reset. 0 if the prototype has none.
   */
  readonly storeCommits: number;
}

export interface SpikeProbe {
  readonly contractVersion: 1;
  readonly prototype: SpikePrototypeId;
  /** True once the app mounted and read its query parameters. */
  readonly ready: boolean;
  snapshot(): SpikeSnapshot;
  renderCounts(): RenderCounts;
  resetRenderCounts(): void;
  /** Store-level view for diagnostics (entity-graph or runtime state); any JSON. */
  storeSnapshot(): unknown;
}

declare global {
  interface Window {
    __spike?: SpikeProbe;
  }
}
