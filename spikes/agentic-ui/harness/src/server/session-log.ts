/**
 * Per-session request log kept by the mock server and the summary the checks
 * compare with `expected.server` (ExpectedServerLog). Pure types + functions;
 * the checks import this module to type GET /sessions/<id>.
 */

export type RequestTrigger = "initial" | "resume" | "resume-after-expiry" | "a2ui-action" | "replay" | "unmatched";

export type RequestOutcome = "in-progress" | "completed" | "client-aborted" | "fault-dropped" | "no-content" | "rejected";

export interface LoggedResumeEntry {
  readonly interruptId: string;
  readonly status: "resolved" | "cancelled";
  readonly approved?: boolean;
}

export interface LoggedA2uiAction {
  readonly name: string;
  readonly surfaceId?: string;
  readonly sourceComponentId?: string;
  readonly context?: unknown;
}

export interface RequestLogEntry {
  readonly seq: number;
  readonly receivedAt: string;
  readonly method: string;
  readonly scenarioId: string;
  readonly trigger: RequestTrigger;
  readonly runIndex: number | null;
  /** Last-Event-ID header (or lastEventId query) as received. */
  readonly lastEventId: string | null;
  readonly threadId: string | null;
  readonly runId: string | null;
  /** RunAgentInput validated by @ag-ui/core RunAgentInputSchema (GET requests: null). */
  readonly inputValid: boolean | null;
  readonly inputProblems: readonly string[];
  readonly lastUserText: string | null;
  readonly resumeEntries: readonly LoggedResumeEntry[];
  readonly a2uiAction: LoggedA2uiAction | null;
  readonly resolvedAfterExpiry: boolean;
  readonly startAt: number;
  readonly totalItems: number;
  itemsWritten: number;
  outcome: RequestOutcome;
  note: string | null;
}

export interface SessionLog {
  readonly sessionId: string;
  readonly createdAt: string;
  readonly requests: RequestLogEntry[];
  /** interruptId -> ISO expiry the server wrote into RUN_FINISHED. */
  readonly interruptExpiries: Record<string, string>;
  /** Run index served last (reconnects replay this run). */
  lastRunIndex: number | null;
  /** Run indexes whose injected fault has already fired. */
  readonly faultsFired: number[];
}

/** Shape compared with ExpectedServerLog (src/domain/expected.ts). */
export interface SessionSummary {
  readonly requestCount: number;
  readonly resumeEntries: readonly LoggedResumeEntry[];
  readonly noResolvedResumeAfterExpiry: boolean;
  readonly resumedWithLastEventId: boolean;
  readonly clientAborted: boolean;
  readonly a2uiActions: readonly LoggedA2uiAction[];
  readonly unmatchedRequests: number;
  readonly invalidInputs: number;
}

export function newSessionLog(sessionId: string): SessionLog {
  return { sessionId, createdAt: new Date().toISOString(), requests: [], interruptExpiries: {}, lastRunIndex: null, faultsFired: [] };
}

export function summarizeSession(log: SessionLog): SessionSummary {
  const requests = log.requests;
  const dropPositions = new Set(requests.filter((r) => r.outcome === "fault-dropped").map((r) => String(r.startAt + r.itemsWritten)));
  return {
    requestCount: requests.length,
    resumeEntries: requests.flatMap((r) => r.resumeEntries),
    noResolvedResumeAfterExpiry: !requests.some((r) => r.resolvedAfterExpiry),
    resumedWithLastEventId: requests.some((r) => r.lastEventId !== null && dropPositions.has(r.lastEventId)),
    clientAborted: requests.some((r) => r.outcome === "client-aborted"),
    a2uiActions: requests.flatMap((r) => (r.a2uiAction === null ? [] : [r.a2uiAction])),
    unmatchedRequests: requests.filter((r) => r.trigger === "unmatched").length,
    invalidInputs: requests.filter((r) => r.inputValid === false).length,
  };
}

export interface HitRecord {
  readonly at: number;
  readonly listener: "allowed-media" | "evil";
  readonly method: string;
  readonly path: string;
  readonly referer: string | null;
}

/** In-memory store of sessions and media/evil hits. */
export class SessionStore {
  private readonly sessions = new Map<string, SessionLog>();
  private readonly hits: HitRecord[] = [];
  private seq = 0;

  session(sessionId: string): SessionLog {
    let log = this.sessions.get(sessionId);
    if (log === undefined) {
      log = newSessionLog(sessionId);
      this.sessions.set(sessionId, log);
    }
    return log;
  }

  find(sessionId: string): SessionLog | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  ids(): string[] {
    return [...this.sessions.keys()];
  }

  nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  recordHit(hit: HitRecord): void {
    this.hits.push(hit);
    if (this.hits.length > 10_000) this.hits.splice(0, this.hits.length - 10_000);
  }

  hitsSince(sinceMs: number): HitRecord[] {
    return this.hits.filter((h) => h.at >= sinceMs);
  }
}
