/**
 * Token-rate overlay for streaming text. Deltas are staged here instead of
 * being committed to the durable store; the session publishes them at most
 * once per animation frame (throttled further for long texts) and clears an
 * entry once the store holds the message's settled text.
 */

type Listener = () => void;

export class LiveTextBuffer {
  private readonly published = new Map<string, string>();
  private readonly staged = new Map<string, string>();
  private readonly listeners = new Map<string, Set<Listener>>();

  stage(id: string, text: string): void {
    this.staged.set(id, text);
  }

  hasStaged(): boolean {
    return this.staged.size > 0;
  }

  /** Longest staged text: drives the adaptive publish interval. */
  longestStaged(): number {
    let max = 0;
    for (const text of this.staged.values()) max = Math.max(max, text.length);
    return max;
  }

  publish(): void {
    const changed = [...this.staged.entries()];
    this.staged.clear();
    for (const [id, text] of changed) {
      this.published.set(id, text);
      this.notify(id);
    }
  }

  /** Drops overlay entries for messages that are no longer streaming. */
  retain(isStreaming: (id: string) => boolean): void {
    for (const id of [...this.published.keys(), ...this.staged.keys()]) {
      if (isStreaming(id)) continue;
      this.staged.delete(id);
      if (this.published.delete(id)) this.notify(id);
    }
  }

  get(id: string): string | undefined {
    return this.published.get(id);
  }

  subscribe(id: string, listener: Listener): () => void {
    const set = this.listeners.get(id) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(id, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(id);
    };
  }

  private notify(id: string): void {
    for (const listener of this.listeners.get(id) ?? []) listener();
  }
}
