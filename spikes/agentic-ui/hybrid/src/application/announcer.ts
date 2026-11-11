/**
 * Throttled screen-reader announcements for the single polite live region (contract.md §6).
 * Streaming text itself is never live; this posts at most one progress line per second and a short
 * final summary once the run settles.
 */

export const ANNOUNCE_INTERVAL_MS = 1100;
export const FINAL_SUMMARY_CHARS = 200;

type Listener = (text: string) => void;

function plain(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>|[\]()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarise(prefix: string, markdown: string): string {
  const text = plain(markdown);
  const body = text.length > FINAL_SUMMARY_CHARS ? `${text.slice(0, FINAL_SUMMARY_CHARS - 1).trimEnd()}…` : text;
  return body === "" ? prefix : `${prefix} ${body}`;
}

export class Announcer {
  private text = "";
  private lastAt = Number.NEGATIVE_INFINITY;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly now: () => number) {}

  current(): string {
    return this.text;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Progress while streaming: dropped unless a second has passed since the last announcement. */
  progress(countWords: () => number): void {
    const t = this.now();
    if (t - this.lastAt < ANNOUNCE_INTERVAL_MS) return;
    const wordCount = countWords();
    this.post(wordCount === 0 ? "Assistant is responding." : `Assistant is responding, ${wordCount} words so far.`, t);
  }

  /** Final announcement: always posted, capped well under 300 characters. */
  final(text: string): void {
    this.post(text, this.now());
  }

  private post(text: string, t: number): void {
    this.lastAt = t;
    this.text = text === this.text ? `${text} ` : text;
    for (const l of this.listeners) l(this.text);
  }
}
