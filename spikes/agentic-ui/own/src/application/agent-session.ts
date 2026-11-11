/**
 * Use cases for one conversation thread: submit a prompt, cancel a run,
 * decide an interrupt, send an A2UI action. Holds the in-memory transcript
 * (the reducer's state, read synchronously by the probe) and decides when to
 * write it to the durable store:
 *
 * - boundary events (start/end/result/run lifecycle/state/activity/custom) commit
 *   once per microtask, so a network chunk full of boundaries is one commit;
 * - streamed deltas never commit per token: they go to the LiveTextBuffer,
 *   published by the PublishScheduler (next frame, bounded by a deadline when
 *   frames are throttled or paused; throttled further as the text grows), with a
 *   durability checkpoint commit at most every CHECKPOINT_MS.
 */
import { isDeltaEvent, type AgUiDomainEvent } from "../domain/agui-event.ts";
import type { HitlDecision } from "../domain/hitl-machine.ts";
import { emptyTranscript, isRunSettled, type TranscriptState } from "../domain/transcript-model.ts";
import { applyHitl, reduceAgentEvent, reduceClientAction, type ClientAction, type ReduceContext } from "../domain/transcript-reducer.ts";
import type { Announcer } from "./announcer.ts";
import type { LiveTextBuffer } from "./live-text-buffer.ts";
import { PublishScheduler, type PublishClock, type PublishStats } from "./publish-scheduler.ts";
import type { A2uiSurfaceHost, A2uiUserAction, AgUiTransport, CommitReason, Scheduler, TranscriptStore, TransportOutcome } from "./ports.ts";
import { buildRunInput, type RunOptions } from "./run-input.ts";

const CHECKPOINT_MS = 1_000;
const MIN_PUBLISH_MS = 16;
const MAX_PUBLISH_MS = 250;

export interface AgentSessionDeps {
  readonly threadId: string;
  readonly transport: AgUiTransport;
  readonly store: TranscriptStore;
  readonly a2ui: A2uiSurfaceHost;
  readonly scheduler: Scheduler;
  readonly publishClock: PublishClock;
  /** Upper bound on publish latency once a publish is due (default 50 ms). */
  readonly publishDeadlineMs?: number;
  readonly live: LiveTextBuffer;
  readonly announcer: Announcer;
  readonly reduceContext: ReduceContext;
}

/** Wall-clock marks of the latest run (ms, scheduler clock), for diagnostics. */
export interface RunTiming {
  readonly startedAt: number | null;
  readonly settledAt: number | null;
}

interface ActiveRun {
  readonly token: number;
  readonly controller: AbortController;
}

/** Longer texts re-parse more markdown per publish, so publish them less often. */
export function publishIntervalMs(textLength: number): number {
  return Math.min(MAX_PUBLISH_MS, MIN_PUBLISH_MS + Math.floor(textLength / 400));
}

export class AgentSession {
  private state: TranscriptState;
  private active: ActiveRun | null = null;
  private runSeq = 0;
  private userSeq = 0;
  private commitQueued: CommitReason | null = null;
  private lastCommitAt = 0;
  private lastPublishAt = 0;
  private readonly publisher: PublishScheduler;
  private timing: { startedAt: number | null; settledAt: number | null } = { startedAt: null, settledAt: null };
  private readonly expiryTimers = new Map<string, () => void>();
  private readonly decisionsInFlight = new Set<string>();

  private readonly deps: AgentSessionDeps;

  constructor(deps: AgentSessionDeps) {
    this.deps = deps;
    this.state = emptyTranscript(deps.threadId);
    this.publisher = new PublishScheduler(deps.publishClock, () => this.publishTick(), deps.publishDeadlineMs);
    this.commitNow("boundary");
  }

  publishStats(): PublishStats {
    return this.publisher.readStats();
  }

  runTiming(): RunTiming {
    return { ...this.timing };
  }

  resetDiagnostics(): void {
    this.publisher.resetStats();
  }

  current(): TranscriptState {
    return this.state;
  }

  isStreaming(): boolean {
    return this.active !== null;
  }

  async submit(text: string): Promise<void> {
    if (this.active !== null || text.trim() === "") return;
    this.userSeq += 1;
    this.dispatch({ type: "USER_MESSAGE", id: `user-${this.userSeq}`, text });
    await this.startRun({});
  }

  cancel(): void {
    const run = this.active;
    if (run === null) return;
    this.active = null;
    run.controller.abort();
    this.dispatch({ type: "RUN_ABORTED" });
    this.commitNow("boundary");
    this.timing.settledAt = this.deps.scheduler.now();
    this.deps.announcer.settled(this.state);
  }

  async decide(interruptId: string, decision: HitlDecision): Promise<void> {
    if (this.decisionsInFlight.has(interruptId) || this.active !== null) return;
    const result = applyHitl(this.state, interruptId, decision, this.deps.scheduler.now());
    if (!result.accepted) return;
    this.state = result.state;
    this.commitNow("boundary");
    if (result.resume === null) return;
    this.decisionsInFlight.add(interruptId);
    const outcome = await this.startRun({ resume: [result.resume] });
    this.decisionsInFlight.delete(interruptId);
    if (outcome.kind === "failed") {
      this.state = applyHitl(this.state, interruptId, "resume-failed", this.deps.scheduler.now()).state;
      this.commitNow("boundary");
    }
  }

  async sendA2uiAction(action: A2uiUserAction): Promise<void> {
    if (this.active !== null) return;
    await this.startRun({ forwardedProps: { a2uiAction: { userAction: action } } });
  }

  private async startRun(options: Omit<RunOptions, "runId">): Promise<TransportOutcome> {
    this.runSeq += 1;
    const run: ActiveRun = { token: this.runSeq, controller: new AbortController() };
    this.active = run;
    this.timing = { startedAt: this.deps.scheduler.now(), settledAt: null };
    this.dispatch({ type: "RUN_REQUESTED" });
    this.commitNow("boundary");
    this.deps.announcer.runStarted();
    const body = buildRunInput(this.state, { ...options, runId: `run-${this.deps.threadId}-${run.token}` });
    const owns = (): boolean => this.active?.token === run.token;
    const outcome = await this.deps.transport.run(
      body,
      {
        onEvent: (event) => {
          if (owns()) this.onEvent(event);
        },
        onProtocolError: (code, eventType) => {
          if (owns()) this.dispatch({ type: "PROTOCOL_ERROR", code, ...(eventType === undefined ? {} : { eventType }) });
        },
      },
      run.controller.signal,
    );
    if (!owns()) return outcome;
    this.active = null;
    if (outcome.kind === "failed") this.dispatch({ type: "TRANSPORT_FAILED", message: outcome.message });
    else if (this.state.runOpen || !isRunSettled(this.state.runStatus)) this.dispatch({ type: "TRANSPORT_FAILED", message: "The stream ended before the run finished." });
    this.commitNow("boundary");
    this.timing.settledAt = this.deps.scheduler.now();
    this.deps.announcer.settled(this.state);
    return outcome;
  }

  private dispatch(action: ClientAction): void {
    this.state = reduceClientAction(this.state, action);
    this.queueCommit("boundary");
  }

  private onEvent(event: AgUiDomainEvent): void {
    const before = this.state;
    this.state = reduceAgentEvent(before, event, this.deps.reduceContext);
    if ((event.type === "STATE_SNAPSHOT" || event.type === "STATE_DELTA") && this.state.state !== before.state) {
      this.deps.store.projectSharedState(event, before.state);
    }
    if (isDeltaEvent(event) && this.isPureDelta(before)) {
      this.stageDelta(event);
      return;
    }
    this.queueCommit("boundary");
  }

  /** A delta that only grew existing content (no new entity, no rejection). */
  private isPureDelta(before: TranscriptState): boolean {
    return (
      this.state.messageOrder.length === before.messageOrder.length &&
      this.state.toolOrder.length === before.toolOrder.length &&
      this.state.protocolErrors.length === before.protocolErrors.length
    );
  }

  private stageDelta(event: AgUiDomainEvent): void {
    const id = "messageId" in event ? event.messageId : undefined;
    const message = id === undefined ? undefined : this.state.messages[id];
    if (message !== undefined) this.deps.live.stage(message.id, message.text);
    this.deps.announcer.progress();
    this.scheduleFrame();
    if (this.deps.scheduler.now() - this.lastCommitAt >= CHECKPOINT_MS) this.queueCommit("checkpoint");
  }

  private scheduleFrame(): void {
    this.publisher.request();
  }

  /** Runs when the scheduler flushes; long texts wait out their adaptive interval first. */
  private publishTick(): void {
    const now = this.deps.scheduler.now();
    const wait = publishIntervalMs(this.deps.live.longestStaged()) - (now - this.lastPublishAt);
    if (wait > 0) {
      this.publisher.request(wait);
      return;
    }
    this.lastPublishAt = now;
    this.deps.live.publish();
  }

  private queueCommit(reason: CommitReason): void {
    if (this.commitQueued !== null) {
      if (reason === "boundary") this.commitQueued = "boundary";
      return;
    }
    this.commitQueued = reason;
    queueMicrotask(() => {
      const queued = this.commitQueued;
      this.commitQueued = null;
      if (queued !== null) this.commitNow(queued);
    });
  }

  private commitNow(reason: CommitReason): void {
    this.commitQueued = null;
    this.lastCommitAt = this.deps.scheduler.now();
    this.deps.store.commit(this.state, reason);
    const messages = this.state.messages;
    this.deps.live.retain((id) => messages[id]?.status === "streaming");
    this.deps.a2ui.sync(this.state);
    this.armExpiryTimers();
  }

  private armExpiryTimers(): void {
    for (const id of this.state.interruptOrder) {
      const interrupt = this.state.interrupts[id];
      if (interrupt === undefined || this.expiryTimers.has(id) || interrupt.expiresAtMs === undefined) continue;
      if (interrupt.status !== "pending" && interrupt.status !== "failed") continue;
      const delay = Math.max(0, interrupt.expiresAtMs - this.deps.scheduler.now());
      this.expiryTimers.set(id, this.deps.scheduler.after(delay, () => this.expire(id)));
    }
  }

  private expire(interruptId: string): void {
    const result = applyHitl(this.state, interruptId, "expire", this.deps.scheduler.now());
    if (!result.accepted) return;
    this.state = result.state;
    this.commitNow("boundary");
    this.deps.announcer.notice("The approval request expired.");
  }
}
