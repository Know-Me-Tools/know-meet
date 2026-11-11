/**
 * Expected outcome of a scenario, compared against `window.__spike.snapshot()`,
 * the DOM and the mock server's session log. Every field is optional; only the
 * fields present are asserted.
 */
import type {
  InterruptStatus,
  MessageStatus,
  RunStatus,
  SnapshotCustomPart,
  ToolCallStatus,
} from "./spike-probe.ts";

export interface ExpectedMessage {
  readonly id?: string;
  readonly role: "user" | "assistant" | "reasoning";
  /** Exact raw text (concatenated deltas). */
  readonly textEquals?: string;
  /** Substrings that must appear in the raw text. */
  readonly textIncludes?: readonly string[];
  readonly status?: MessageStatus;
  /** For cancel scenarios: raw text must be a strict prefix of this full text. */
  readonly textIsStrictPrefixOf?: string;
}

export interface ExpectedToolCall {
  readonly id: string;
  readonly name: string;
  readonly args?: unknown;
  readonly status: ToolCallStatus;
  readonly resultIncludes?: string;
}

export interface ExpectedInterrupt {
  readonly id: string;
  readonly status: InterruptStatus;
}

export interface ExpectedCustomPart {
  readonly name: string;
  readonly partId?: string;
  readonly rendering: SnapshotCustomPart["rendering"];
}

export interface ExpectedA2uiSurface {
  readonly surfaceId: string;
  readonly renderedComponentIds: readonly string[];
  readonly fallbackComponentIds?: readonly string[];
  readonly dataModel?: unknown;
  readonly deleted?: boolean;
}

/** Assertions about what the mock server observed for the session. */
export interface ExpectedServerLog {
  /** Number of POSTs to the scenario (initial + resumes + reconnects). */
  readonly requestCount?: number;
  /** Resume entries the prototype sent, in order. */
  readonly resumeEntries?: readonly {
    readonly interruptId: string;
    readonly status: "resolved" | "cancelled";
    readonly approved?: boolean;
  }[];
  /** No resolved resume may arrive after the interrupt expired. */
  readonly noResolvedResumeAfterExpiry?: boolean;
  /** At least one request carried Last-Event-ID equal to the dropped position. */
  readonly resumedWithLastEventId?: boolean;
  /** The client aborted the stream before the server finished writing. */
  readonly clientAborted?: boolean;
  /** A2UI actions the prototype sent back through forwardedProps. */
  readonly a2uiActions?: readonly { readonly name: string; readonly surfaceId: string; readonly context?: unknown }[];
}

export interface ExpectedDomAssertion {
  /** CSS selector, evaluated inside [data-testid="km-transcript"]. */
  readonly selector: string;
  readonly count?: number;
  readonly minCount?: number;
  readonly textIncludes?: string;
}

export interface ExpectedOutcome {
  readonly runStatus: RunStatus;
  readonly runErrorCode?: string;
  /** Messages in transcript order (user prompt first). Extra messages fail. */
  readonly messages?: readonly ExpectedMessage[];
  readonly toolCalls?: readonly ExpectedToolCall[];
  readonly interrupts?: readonly ExpectedInterrupt[];
  /** Deep-equal final shared state. */
  readonly state?: unknown;
  readonly customParts?: readonly ExpectedCustomPart[];
  readonly a2uiSurfaces?: readonly ExpectedA2uiSurface[];
  readonly steps?: readonly { readonly name: string; readonly status: "running" | "finished" }[];
  readonly subagents?: readonly { readonly subagentRunId: string; readonly status: "running" | "finished" | "error" }[];
  /** Minimum number of protocol errors the prototype must record (malformed scenarios). */
  readonly minProtocolErrors?: number;
  /** Protocol errors must be zero (default for valid scenarios). */
  readonly noProtocolErrors?: boolean;
  readonly server?: ExpectedServerLog;
  readonly dom?: readonly ExpectedDomAssertion[];
  /** Strings that must not be visible in the transcript. */
  readonly forbiddenText?: readonly string[];
}
