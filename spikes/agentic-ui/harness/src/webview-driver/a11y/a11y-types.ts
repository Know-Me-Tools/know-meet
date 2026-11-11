/**
 * Gate 16.4 (c16): types shared by the in-webview accessibility agent
 * (a11y-agent.ts, injected into the Tauri window) and the trusted-input runner
 * (a11y-run.ts, Node). Type-only: erased when the agent is built.
 */
import type { RunStatus, SpikeSnapshot } from "../../domain/spike-probe.ts";

/** Which accessibility/A2UI check family a single app launch exercises. */
export type A11yKind = "stream" | "focus" | "approve" | "reject" | "alert" | "a2ui" | "a2ui-keyboard";

export interface A11yAgentConfig {
  readonly runId: string;
  readonly prototype: string;
  readonly harnessUrl: string;
  readonly appUrl: string;
  readonly scenarioId: string;
  readonly sessionId: string;
  readonly kind: A11yKind;
  /** Golden surface id for a2ui kinds (corpus/a2ui/surfaces/<id>.json). */
  readonly surfaceId: string | null;
  /** Allow F16 to post a `result` report so the collector judges conformance (compare.ts). */
  readonly judge: boolean;
}

/** What one focused or clicked element looks like to the checks. */
export interface ElementDesc {
  readonly tag: string;
  readonly testid: string | null;
  readonly role: string | null;
  readonly name: string;
  readonly a2uiId: string | null;
  readonly interruptId: string | null;
  readonly type: string | null;
}

/** Viewport rectangle (CSS px == points at zoom 1) of an element the runner may click. */
export interface TargetRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface ApprovalView {
  readonly interruptId: string;
  readonly status: string;
  readonly approveName: string;
  readonly rejectName: string;
  readonly approveDisabled: boolean;
}

/** Posted on F19 (and automatically at ready, settle and pending approval). */
export interface A11yState {
  readonly seq: number;
  readonly t: number;
  readonly reason: string;
  readonly active: ElementDesc;
  readonly runStatus: RunStatus | null;
  readonly approvals: readonly ApprovalView[];
  readonly targets: Readonly<Record<string, TargetRect>>;
  readonly viewport: { readonly w: number; readonly h: number; readonly scrollY: number };
  readonly focusables: readonly ElementDesc[];
  readonly visibleText: Readonly<Record<string, boolean>>;
  readonly a2uiSurfaces: SpikeSnapshot["a2uiSurfaces"];
  readonly hasFocus: boolean;
  readonly axeRuns: number;
  /** Current value of km-composer-input (typed text as the page received it). */
  readonly composer: string;
}

export interface LiveRecord {
  readonly t: number;
  readonly text: string;
}

export interface BusyRecord {
  readonly t: number;
  readonly value: string | null;
  readonly runStatus: RunStatus | null;
}

export interface FocusRecord {
  readonly t: number;
  readonly el: ElementDesc;
}

export interface KeyRecord {
  readonly t: number;
  readonly key: string;
  readonly trusted: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
  readonly target: ElementDesc;
}

export interface ClickRecord {
  readonly t: number;
  readonly trusted: boolean;
  readonly target: ElementDesc;
}

export interface AxeRecord {
  readonly t: number;
  readonly label: string;
  readonly runStatus: RunStatus | null;
  readonly pendingApprovals: number;
  readonly violations: readonly string[];
  readonly nodes: readonly string[];
}

/** Sampled once when the streaming assistant text first reaches 200 characters. */
export interface StreamSample {
  readonly t: number;
  readonly ariaBusy: string | null;
  readonly streamingMessage: boolean;
  readonly liveAncestors: readonly string[];
}

export interface LiveRegionInfo {
  readonly count: number;
  readonly ariaLive: string | null;
  readonly role: string | null;
}

export interface AlertInfo {
  readonly count: number;
  readonly visible: boolean;
  readonly text: string;
}

/** Posted on F17: everything the logs saw plus the final snapshot. */
export interface A11yFinal {
  readonly t: number;
  readonly live: readonly LiveRecord[];
  readonly busy: readonly BusyRecord[];
  readonly focus: readonly FocusRecord[];
  readonly keys: readonly KeyRecord[];
  readonly clicks: readonly ClickRecord[];
  readonly axe: readonly AxeRecord[];
  readonly statuses: readonly { readonly t: number; readonly status: RunStatus }[];
  readonly firstTextAt: number | null;
  readonly sample200: StreamSample | null;
  readonly liveRegion: LiveRegionInfo;
  readonly alert: AlertInfo;
  readonly transcriptBusy: string | null;
  readonly resources: readonly string[];
  readonly disallowedRequests: readonly string[];
  readonly domProblems: readonly string[];
  readonly csp: readonly { readonly directive: string; readonly blockedUri: string }[];
  readonly snapshot: SpikeSnapshot | null;
  readonly userAgent: string;
  readonly errors: readonly string[];
}
