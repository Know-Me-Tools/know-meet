/**
 * Screen-reader announcements for the single polite live region. Streaming
 * text is never announced token by token: one announcement when a run starts,
 * throttled progress notes while it streams, and a short summary when it ends.
 */
import type { TranscriptState } from "../domain/transcript-model.ts";

const PROGRESS_INTERVAL_MS = 5_000;
const SUMMARY_CHARS = 160;

type Listener = () => void;

export function plainSummary(markdown: string, max = SUMMARY_CHARS): string {
  const plain = markdown
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/[#>*_`|~[\]()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

function lastAssistantText(state: TranscriptState): string {
  for (let i = state.messageOrder.length - 1; i >= 0; i -= 1) {
    const m = state.messages[state.messageOrder[i] ?? ""];
    if (m?.role === "assistant" && m.text !== "") return m.text;
  }
  return "";
}

export function settledAnnouncement(state: TranscriptState): string {
  switch (state.runStatus) {
    case "finished": {
      const summary = plainSummary(lastAssistantText(state));
      return summary === "" ? "Assistant finished." : `Assistant replied: ${summary}`;
    }
    case "interrupted": {
      const pending = state.interruptOrder.map((id) => state.interrupts[id]).filter((i) => i?.status === "pending" || i?.status === "failed");
      return pending.length > 0 ? `Approval needed: ${plainSummary(pending[0]?.message ?? pending[0]?.reason ?? "", 120)}` : "Assistant is waiting.";
    }
    case "cancelled":
      return "Response cancelled.";
    case "error":
      return `Error: ${plainSummary(state.runErrorMessage ?? state.runErrorCode ?? "the run failed", 120)}`;
    default:
      return "";
  }
}

export class Announcer {
  private text = "";
  private lastProgressAt = Number.NEGATIVE_INFINITY;
  private progressCount = 0;
  private readonly listeners = new Set<Listener>();

  private readonly now: () => number;

  constructor(now: () => number) {
    this.now = now;
  }

  current(): string {
    return this.text;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  runStarted(): void {
    this.progressCount = 0;
    this.lastProgressAt = this.now();
    this.set("Assistant is responding.");
  }

  /** Called on streamed deltas; announces at most once per PROGRESS_INTERVAL_MS. */
  progress(): void {
    const now = this.now();
    if (now - this.lastProgressAt < PROGRESS_INTERVAL_MS) return;
    this.lastProgressAt = now;
    this.progressCount += 1;
    this.set(this.progressCount % 2 === 1 ? "Still responding…" : "Still responding, please wait…");
  }

  settled(state: TranscriptState): void {
    const text = settledAnnouncement(state);
    if (text !== "") this.set(text);
  }

  notice(text: string): void {
    this.set(plainSummary(text, 200));
  }

  private set(text: string): void {
    if (text === this.text) return;
    this.text = text;
    for (const l of this.listeners) l();
  }
}
