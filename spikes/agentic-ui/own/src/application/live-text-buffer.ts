/**
 * Token-rate overlay for streaming text. Deltas are staged here instead of
 * being committed to the durable store; the session publishes them at most
 * once per animation frame (throttled further for long texts) and clears an
 * entry once the store holds the message's settled text.
 *
 * Published text lives in a LiveTextOverlay port. In the app that is the
 * entity-graph 4.4.0 render-only live layer (infrastructure/entity-graph-live-text.ts);
 * the in-memory overlay below keeps this class usable without a graph (tests).
 */
import type { LiveTextOverlay } from "./ports.ts";

type Listener = () => void;

/** Map-backed overlay with per-id listeners (the pre-4.4.0 behaviour). */
export class InMemoryLiveTextOverlay implements LiveTextOverlay {
  private readonly texts = new Map<string, string>();
  private readonly listeners = new Map<string, Set<Listener>>();

  set(id: string, text: string): void {
    this.texts.set(id, text);
    this.notify(id);
  }

  clear(id: string): boolean {
    if (!this.texts.delete(id)) return false;
    this.notify(id);
    return true;
  }

  get(id: string): string | undefined {
    return this.texts.get(id);
  }

  ids(): string[] {
    return [...this.texts.keys()];
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

export class LiveTextBuffer {
  private readonly staged = new Map<string, string>();
  private readonly overlay: LiveTextOverlay;

  constructor(overlay: LiveTextOverlay = new InMemoryLiveTextOverlay()) {
    this.overlay = overlay;
  }

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
    for (const [id, text] of changed) this.overlay.set(id, text);
  }

  /** Drops overlay entries for messages that are no longer streaming. */
  retain(isStreaming: (id: string) => boolean): void {
    for (const id of [...this.overlay.ids(), ...this.staged.keys()]) {
      if (isStreaming(id)) continue;
      this.staged.delete(id);
      this.overlay.clear(id);
    }
  }

  get(id: string): string | undefined {
    return this.overlay.get(id);
  }

  subscribe(id: string, listener: Listener): () => void {
    return this.overlay.subscribe(id, listener);
  }
}
