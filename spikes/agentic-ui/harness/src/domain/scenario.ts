/**
 * Golden AG-UI scenario file format (corpus/ag-ui/scenarios/*.json).
 * Pure types: no runtime dependencies beyond @ag-ui/core types.
 */
import type { Event as AgUiEvent } from "@ag-ui/core";
import type { ExpectedOutcome } from "./expected.ts";

export type { AgUiEvent };

/**
 * One item on the wire. Normally a typed AG-UI event. Intentionally invalid
 * scenarios also use `invalid-event` (a JSON object that breaks the schema or
 * ordering) and `raw-sse` (bytes written verbatim, e.g. non-JSON data).
 */
export type WireItem =
  | { readonly kind: "event"; readonly event: AgUiEvent }
  | { readonly kind: "invalid-event"; readonly event: Readonly<Record<string, unknown>>; readonly note: string }
  | { readonly kind: "raw-sse"; readonly rawSse: string; readonly note: string };

/** What request selects a run of the scenario. */
export type RunTrigger =
  | { readonly kind: "initial" }
  | {
      readonly kind: "resume";
      readonly interruptId: string;
      /** ResumeEntry.status the request must carry. */
      readonly status: "resolved" | "cancelled";
      /** For status "resolved": the `approved` value in the payload. */
      readonly approved?: boolean;
    }
  | { readonly kind: "resume-after-expiry"; readonly interruptId: string }
  | { readonly kind: "a2ui-action"; readonly actionName: string };

/** Server-side faults injected into a run (only on the first attempt). */
export interface RunFaults {
  /** Destroy the socket after writing this many wire items (no Last-Event-ID yet). */
  readonly dropConnectionAfterItems?: number;
}

/** Serve-time rewrites (applied by the mock server, never stored resolved). */
export interface RunRewrites {
  /** Replace every interrupt `expiresAt` with now + this many ms. */
  readonly interruptExpiresInMs?: number;
  /** Echo RunAgentInput threadId/runId into RUN_* events (default true). */
  readonly echoRunIds?: boolean;
}

export interface ScenarioRun {
  readonly trigger: RunTrigger;
  readonly items: readonly WireItem[];
  readonly faults?: RunFaults;
  readonly rewrites?: RunRewrites;
}

/** Pacing defaults; the request query (`rate`, `gap`) overrides them. */
export interface Pacing {
  /** Text/reasoning/tool-args deltas per second. */
  readonly tokensPerSecond: number;
  /** Delay before every non-delta event, in ms. */
  readonly eventGapMs: number;
}

/** A user/test action the check suite performs while the scenario runs. */
export type Interaction =
  | { readonly do: "approve"; readonly interruptId: string; readonly via: "keyboard" | "pointer" }
  | { readonly do: "reject"; readonly interruptId: string; readonly via: "keyboard" | "pointer" }
  | { readonly do: "wait-for-expiry"; readonly interruptId: string }
  | { readonly do: "cancel-run"; readonly afterTextChars: number }
  | {
      readonly do: "a2ui-click";
      readonly surfaceId: string;
      readonly componentId: string;
      /** Optional field values to fill first: A2UI component id -> value. */
      readonly fill?: Readonly<Record<string, string>>;
    };

export type ScenarioValidity = "valid" | "intentionally-invalid";

export interface ScenarioFile {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly corpusFormatVersion: number;
  readonly agUiCorePackage: string;
  readonly agUiProtocolVersion: string;
  readonly a2uiSpecVersion?: string;
  readonly tags: readonly string[];
  readonly userPrompt: string;
  readonly pacing: Pacing;
  readonly runs: readonly ScenarioRun[];
  readonly interactions: readonly Interaction[];
  readonly validity: ScenarioValidity;
  /**
   * For intentionally invalid scenarios: indexes (within runs[0].items) that
   * MUST fail @ag-ui/core schema validation or ordering rules.
   */
  readonly expectedInvalidItems?: readonly number[];
  readonly expected: ExpectedOutcome;
}
