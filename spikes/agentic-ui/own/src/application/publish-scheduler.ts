/**
 * Bounded publish scheduling for streamed text (gate 16.1).
 *
 * Publishing used to wait for requestAnimationFrame alone. A WKWebView window
 * that is occluded, unfocused or minimised throttles or pauses frames, so
 * streamed text could wait indefinitely. This scheduler keeps the flush
 * bounded whatever the frame rate:
 *
 * - visible page: race the next frame against a `deadlineMs` timer; the first
 *   to fire flushes and cancels the other;
 * - hidden page (frames do not run): flush on the next task (MessageChannel),
 *   which visibility-based timer throttling does not delay;
 * - a request that arrives while a flush is overdue (timers throttled too)
 *   flushes on the next task, so the bound also holds relative to arrivals;
 * - becoming hidden while waiting for a frame flushes on the next task.
 *
 * Framework-free: the clock is a port and the browser adapter lives in
 * infrastructure/browser-clock.ts.
 */

export interface PublishClock {
  now(): number;
  /** requestAnimationFrame. May be throttled or never fire. */
  requestFrame(fn: () => void): () => void;
  /** setTimeout. May be throttled when the page is hidden or occluded. */
  setTimer(ms: number, fn: () => void): () => void;
  /** A macrotask (MessageChannel in browsers): not tied to frames. */
  postTask(fn: () => void): () => void;
  isHidden(): boolean;
  onVisibilityChange(fn: () => void): () => void;
}

export type FlushTrigger = "frame" | "deadline" | "hidden-task" | "overdue-task" | "visibility-task";

export interface PublishStats {
  readonly flushes: number;
  readonly byTrigger: Readonly<Record<FlushTrigger, number>>;
  /** Largest gap between the time a flush became due and the time it ran (ms). */
  readonly maxLagMs: number;
}

export const DEFAULT_PUBLISH_DEADLINE_MS = 50;

type WaitKind = "delay" | "frame" | "task";

interface Pending {
  readonly kind: WaitKind;
  /** When the flush became eligible to run (request time + requested delay). */
  readonly eligibleAt: number;
  /** Latest acceptable flush time. */
  readonly dueBy: number;
  readonly cancel: () => void;
}

const NO_TRIGGERS: Record<FlushTrigger, number> = { frame: 0, deadline: 0, "hidden-task": 0, "overdue-task": 0, "visibility-task": 0 };

export class PublishScheduler {
  private pending: Pending | null = null;
  private stats = { flushes: 0, byTrigger: { ...NO_TRIGGERS }, maxLagMs: 0 };
  private readonly stopWatchingVisibility: () => void;
  private readonly clock: PublishClock;
  private readonly flush: () => void;
  private readonly deadlineMs: number;

  constructor(clock: PublishClock, flush: () => void, deadlineMs: number = DEFAULT_PUBLISH_DEADLINE_MS) {
    if (!(deadlineMs > 0)) throw new RangeError("deadlineMs must be > 0");
    this.clock = clock;
    this.flush = flush;
    this.deadlineMs = deadlineMs;
    this.stopWatchingVisibility = clock.onVisibilityChange(() => this.onVisibilityChange());
  }

  /**
   * Ensures exactly one flush runs no earlier than `delayMs` from now and, after
   * that, within `deadlineMs`. Calls while a flush is pending coalesce.
   */
  request(delayMs = 0): void {
    const now = this.clock.now();
    const pending = this.pending;
    if (pending !== null) {
      if (pending.kind !== "task" && now >= pending.dueBy) this.runOnTask(pending.eligibleAt, "overdue-task");
      return;
    }
    if (delayMs > 0) {
      const eligibleAt = now + delayMs;
      const cancel = this.clock.setTimer(delayMs, () => {
        this.pending = null;
        this.armFlush(eligibleAt);
      });
      this.pending = { kind: "delay", eligibleAt, dueBy: eligibleAt + this.deadlineMs, cancel };
      return;
    }
    this.armFlush(now);
  }

  cancel(): void {
    this.pending?.cancel();
    this.pending = null;
  }

  dispose(): void {
    this.cancel();
    this.stopWatchingVisibility();
  }

  isPending(): boolean {
    return this.pending !== null;
  }

  readStats(): PublishStats {
    return { flushes: this.stats.flushes, byTrigger: { ...this.stats.byTrigger }, maxLagMs: this.stats.maxLagMs };
  }

  resetStats(): void {
    this.stats = { flushes: 0, byTrigger: { ...NO_TRIGGERS }, maxLagMs: 0 };
  }

  private armFlush(eligibleAt: number): void {
    if (this.clock.isHidden()) {
      this.runOnTask(eligibleAt, "hidden-task");
      return;
    }
    let cancelFrame: () => void = () => undefined;
    let cancelTimer: () => void = () => undefined;
    const fire = (trigger: FlushTrigger): void => {
      cancelFrame();
      cancelTimer();
      this.pending = null;
      this.run(eligibleAt, trigger);
    };
    cancelFrame = this.clock.requestFrame(() => fire("frame"));
    cancelTimer = this.clock.setTimer(this.deadlineMs, () => fire("deadline"));
    this.pending = {
      kind: "frame",
      eligibleAt,
      dueBy: eligibleAt + this.deadlineMs,
      cancel: () => {
        cancelFrame();
        cancelTimer();
      },
    };
  }

  private runOnTask(eligibleAt: number, trigger: FlushTrigger): void {
    this.pending?.cancel();
    const cancel = this.clock.postTask(() => {
      this.pending = null;
      this.run(eligibleAt, trigger);
    });
    this.pending = { kind: "task", eligibleAt, dueBy: eligibleAt, cancel };
  }

  private onVisibilityChange(): void {
    const pending = this.pending;
    if (pending !== null && pending.kind === "frame" && this.clock.isHidden()) this.runOnTask(pending.eligibleAt, "visibility-task");
  }

  private run(eligibleAt: number, trigger: FlushTrigger): void {
    this.stats.flushes += 1;
    this.stats.byTrigger[trigger] += 1;
    this.stats.maxLagMs = Math.max(this.stats.maxLagMs, this.clock.now() - eligibleAt);
    this.flush();
  }
}
