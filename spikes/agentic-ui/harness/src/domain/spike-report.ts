/**
 * Reports an in-webview driver (task 15.5, Tauri on macOS: no WebDriver) posts
 * to `POST /spike-report`. Pure types, shared by the driver, the collector and
 * the summary script.
 */
import type { RenderCounts, RunStatus, SpikeSnapshot } from "./spike-probe.ts";

export type DriverMode = "conformance" | "measure";

export interface DriverStep {
  readonly scenarioId: string;
  readonly repeat: number;
  readonly mode: DriverMode;
}

/** Configuration the runner embeds in the driver script. */
export interface DriverConfig {
  readonly runId: string;
  readonly prototype: string;
  readonly harnessUrl: string;
  /** Where the prototype is served (tauri://localhost/index.html); used to come back after an unexpected navigation. */
  readonly appUrl: string;
  readonly plan: readonly DriverStep[];
  readonly hostileMessageId: string;
  /** Run axe (WCAG 2.0-2.2 A/AA) once the scenario settled, when axe is injected. */
  readonly axe: boolean;
  /** How long the driver re-posts a result while the collector reports problems (Playwright's expect.poll). */
  readonly verdictPollMs: number;
  /** Diagnostic only: run a requestAnimationFrame loop and report the frame rate between submit and settle. */
  readonly frameProbe?: boolean;
}

export interface WebviewMetrics {
  /** Submit click to the first assistant text in the DOM (same definition as src/measure/page-timeline.ts). */
  readonly timeToFirstTokenMs: number | null;
  /** Submit click to the first settle, 20 ms polling. */
  readonly totalStreamMs: number | null;
  readonly firstSettleStatus: RunStatus | null;
  /** renderCounts() at the first settle (as the browser measure script reads it). */
  readonly counts: RenderCounts | null;
  /** null: WebKit has no long-task API. */
  readonly longTaskTotalMs: number | null;
  readonly longTaskCount: number | null;
  /** null: WebKit exposes no JS heap size to page script. */
  readonly jsHeapUsedBytes: number | null;
  readonly domNodes: number;
  /** requestAnimationFrame callbacks per second between submit and first settle (frameProbe runs only). */
  readonly framesPerSecond?: number | null;
  /** document.hasFocus() and visibilityState at the first settle (WKWebView defers rAF for non-key windows). */
  readonly hasFocus?: boolean;
  readonly visibility?: string;
}

export interface CspViolationRecord {
  readonly directive: string;
  readonly blockedUri: string;
  readonly sourceFile: string;
  readonly line: number;
  readonly sample: string;
  readonly disposition: string;
  readonly at: number;
}

/** Checks the driver can only evaluate inside the page. */
export interface ClientChecks {
  /** expected.dom and expected.forbiddenText problems (checks/support/conformance.ts). */
  readonly domProblems: readonly string[];
  /** Hostile selector/text problems (checks/hostile.spec.ts selectorProblems). */
  readonly hostileProblems: readonly string[];
  readonly xssCalls: readonly string[];
  readonly dialogs: readonly string[];
  /** Resource-timing entries outside the page origin, the harness origin, data:, blob:, about:. */
  readonly disallowedRequests: readonly string[];
  readonly onAttributes: readonly string[];
  /** Hostile: first visible assistant text to message non-streaming, ms. */
  readonly finalizeMs: number | null;
  /** Interactions that could not be performed the way the Playwright suite performs them. */
  readonly deviations: readonly string[];
}

export interface ResultReport {
  readonly kind: "result";
  readonly runId: string;
  readonly prototype: string;
  readonly step: number;
  readonly scenarioId: string;
  readonly repeat: number;
  readonly mode: DriverMode;
  readonly sessionId: string;
  readonly startedAtEpochMs: number;
  readonly attempt: number;
  readonly snapshot: SpikeSnapshot | null;
  readonly metrics: WebviewMetrics | null;
  readonly client: ClientChecks;
  readonly csp: readonly CspViolationRecord[];
  readonly axe: readonly string[] | null;
  readonly userAgent: string;
  readonly error: string | null;
}

export type EventKind = "start" | "unexpected-navigation" | "csp-header" | "driver-error" | "done";

export interface EventReport {
  readonly kind: "event";
  readonly runId: string;
  readonly step: number | null;
  readonly event: EventKind;
  readonly detail: string;
}

export type SpikeReport = ResultReport | EventReport;

/** Collector answer to a result: every problem found (empty = pass). */
export interface ReportVerdict {
  readonly problems: readonly string[];
}

export interface ReportProgress {
  readonly lastStep: number;
  readonly done: boolean;
  readonly records: number;
}
