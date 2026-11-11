/**
 * Use case: record the session durably. Every accepted AG-UI event and every client decision is
 * appended to the journal under a deterministic id (`<runId>#<SSE id>` or `<runId>#c<n>`), folded
 * into the transcript projection, and committed to the durable store at message/tool/run
 * boundaries (plus a 1 s durability checkpoint during long streams). Re-delivering a frame with the
 * same id (a Last-Event-ID replay) is a no-op, which makes the checkpoints idempotent.
 */
import type { WireEvent } from "../domain/event-guard.ts";
import type { ClientEvent, JsonPatcher } from "../domain/transcript/projector.ts";
import { TranscriptProjector } from "../domain/transcript/projector.ts";
import { Announcer, summarise } from "./announcer.ts";
import type { DurableStore, JournalEntry } from "./ports.ts";

const DURABILITY_CHECKPOINT_MS = 1000;
const SETTLED: ReadonlySet<string> = new Set(["finished", "interrupted", "cancelled", "error"]);

export class SessionRecorder {
  readonly projector: TranscriptProjector;
  readonly announcer: Announcer;
  private readonly seen = new Set<string>();
  private pending: JournalEntry[] = [];
  private seq = 0;
  private clientSeq = 0;
  private lastCommitAt = 0;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly store: DurableStore,
    patcher: JsonPatcher,
    allowedMediaOrigins: readonly string[],
    private readonly now: () => number,
  ) {
    this.projector = new TranscriptProjector(patcher, allowedMediaOrigins);
    this.announcer = new Announcer(now);
  }

  /** Called on every commit so read models (approval cards, run status) refresh at checkpoints. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  serverEvent(runId: string, frameId: string, event: WireEvent): void {
    const id = `${runId}#${frameId}`;
    if (this.seen.has(id)) return;
    this.append(id, "server", event);
    const before = this.projector.run.status;
    const boundary = this.projector.applyServer(event);
    this.announceFor(event, before);
    if (boundary || this.now() - this.lastCommitAt >= DURABILITY_CHECKPOINT_MS) this.checkpoint(id);
  }

  protocolError(runId: string, frameId: string, code: string, eventType: string | undefined): void {
    const id = `${runId}#${frameId}`;
    if (this.seen.has(id)) return;
    this.append(id, "protocol-error", { code, eventType });
    this.projector.recordProtocolError(eventType === undefined ? { code } : { code, eventType });
  }

  client(event: ClientEvent): void {
    this.clientSeq += 1;
    const id = `${this.projector.run.runId ?? "pre-run"}#c${this.clientSeq}`;
    const before = this.projector.run.status;
    this.append(id, "client", event);
    this.projector.applyClient(event);
    if (event.type === "client.cancel" || event.type === "client.transport-error") this.announceSettled(before);
    this.checkpoint(id);
  }

  private append(id: string, source: JournalEntry["source"], payload: unknown): void {
    this.seen.add(id);
    this.seq += 1;
    this.pending.push({ id, seq: this.seq, source, payload });
  }

  private checkpoint(lastId: string): void {
    if (!this.projector.hasDirty() && this.pending.length === 0) return;
    this.store.commit(this.projector.takeDirty(), this.pending, `checkpoint:${lastId}`);
    this.pending = [];
    this.lastCommitAt = this.now();
    this.armExpiries();
    for (const l of this.listeners) l();
  }

  private armExpiries(): void {
    for (const interrupt of this.projector.interrupts.values()) {
      if (interrupt.status !== "pending" || interrupt.expiresAt === undefined || this.timers.has(interrupt.id)) continue;
      const delay = Math.max(0, Date.parse(interrupt.expiresAt) - Date.now());
      this.timers.set(interrupt.id, setTimeout(() => this.client({ type: "client.expired", interruptId: interrupt.id }), delay));
    }
  }

  private announceFor(event: WireEvent, before: string): void {
    if (event.type === "TEXT_MESSAGE_CONTENT" || event.type === "TEXT_MESSAGE_CHUNK") {
      this.announcer.progress(() => this.streamingWords());
      return;
    }
    if (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR") this.announceSettled(before);
  }

  private announceSettled(before: string): void {
    const run = this.projector.run;
    if (!SETTLED.has(run.status) || before === run.status) return;
    const last = [...this.projector.messages.values()].reverse().find((m) => m.role === "assistant" && m.text !== "");
    const text = last?.text ?? "";
    switch (run.status) {
      case "error":
        this.announcer.final(`The run failed${run.errorCode === undefined ? "" : ` (${run.errorCode})`}.`);
        return;
      case "cancelled":
        this.announcer.final(summarise("Response stopped.", text));
        return;
      case "interrupted":
        this.announcer.final("The assistant needs your approval to continue.");
        return;
      default:
        this.announcer.final(summarise("Assistant replied:", text));
    }
  }

  private streamingWords(): number {
    let words = 0;
    for (const m of this.projector.messages.values()) {
      if (m.status === "streaming" && m.role === "assistant") words += m.text.split(/\s+/).filter(Boolean).length;
    }
    return words;
  }
}
