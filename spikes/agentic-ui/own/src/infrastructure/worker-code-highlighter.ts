/**
 * Streamdown code-highlighter plugin that runs Shiki in a dedicated Worker (gate 16.3 follow-up).
 *
 * Why: @streamdown/code highlights on the main thread with Shiki's JavaScript regex engine. The
 * first `codeToTokens` for a grammar compiles that grammar's regular expressions; for TypeScript
 * this takes ~1.07 s in WebKit/JSC (~75 ms in Chromium) as one uninterruptible task, which froze
 * O's 20 KB streams for a full second (gates/16-3-followup-webkit-stall.md). Running the same
 * plugin inside a Worker keeps that compile, and every later tokenisation, off the main thread.
 *
 * The plugin keeps Streamdown's contract: `highlight` returns a cached result synchronously, or
 * returns null and later calls the callback (Streamdown then keeps showing the previous result or
 * the plain code until it arrives). Language support and themes come from the main-thread
 * @streamdown/code plugin, which is never asked to highlight. Without Worker support, or after a
 * worker error, every call falls back to that plugin.
 */
import type { CodeHighlighterPlugin, HighlightOptions, HighlightResult } from "@streamdown/code";

/** Request posted to the worker. Themes are names: theme objects are not sent across. */
export interface HighlightRequest {
  readonly id: number;
  readonly code: string;
  readonly language: string;
  readonly themes: readonly [string, string];
  readonly isIncomplete: boolean;
}

export type HighlightReply = { readonly id: number; readonly result: HighlightResult } | { readonly id: number; readonly error: string };

/** The part of `Worker` this adapter uses (a port, so tests can supply a fake). */
export interface HighlightWorker {
  postMessage(request: HighlightRequest): void;
  onmessage: ((event: { data: HighlightReply }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  terminate(): void;
}

type Callback = (result: HighlightResult) => void;

/** Completed (not streaming) results kept for synchronous re-render hits. */
const CACHE_LIMIT = 256;

export interface WorkerHighlighterStats {
  readonly requests: number;
  readonly cacheHits: number;
  readonly posted: number;
  readonly replies: number;
  readonly fallbacks: number;
}

export interface WorkerCodeHighlighter extends CodeHighlighterPlugin {
  stats(): WorkerHighlighterStats;
}

export function createWorkerCodeHighlighter(base: CodeHighlighterPlugin, createWorker: () => HighlightWorker | null): WorkerCodeHighlighter {
  let worker: HighlightWorker | null = null;
  let failed = false;
  let nextId = 1;
  const waiting = new Map<number, { key: string; options: HighlightOptions; cache: boolean }>();
  const byKey = new Map<string, Callback[]>();
  const cache = new Map<string, HighlightResult>();
  const counts = { requests: 0, cacheHits: 0, posted: 0, replies: 0, fallbacks: 0 };

  const remember = (key: string, result: HighlightResult): void => {
    cache.delete(key);
    cache.set(key, result);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  };

  const settle = (id: number, result: HighlightResult): void => {
    const entry = waiting.get(id);
    if (entry === undefined) return;
    waiting.delete(id);
    if (entry.cache) remember(entry.key, result);
    const callbacks = byKey.get(entry.key) ?? [];
    byKey.delete(entry.key);
    for (const cb of callbacks) cb(result);
  };

  /** Hands every waiting request to the main-thread plugin; used once, when the worker fails. */
  const failOver = (): void => {
    failed = true;
    worker?.terminate();
    worker = null;
    const pending = [...waiting.entries()];
    for (const [id, { options }] of pending) {
      counts.fallbacks += 1;
      const sync = base.highlight(options, (r) => settle(id, r));
      if (sync !== null) settle(id, sync);
    }
  };

  const ensureWorker = (): HighlightWorker | null => {
    if (worker !== null || failed) return worker;
    try {
      worker = createWorker();
    } catch {
      worker = null;
    }
    if (worker === null) {
      failed = true;
      return null;
    }
    worker.onmessage = ({ data }) => {
      counts.replies += 1;
      if ("result" in data) settle(data.id, data.result);
      else failOver();
    };
    worker.onerror = () => failOver();
    return worker;
  };

  const themeNames = (themes: HighlightOptions["themes"]): [string, string] | null =>
    typeof themes[0] === "string" && typeof themes[1] === "string" ? [themes[0], themes[1]] : null;

  return {
    name: "shiki",
    type: "code-highlighter",
    supportsLanguage: (language) => base.supportsLanguage(language),
    getSupportedLanguages: () => base.getSupportedLanguages(),
    getThemes: () => base.getThemes(),
    stats: () => ({ ...counts }),
    highlight(options, callback) {
      counts.requests += 1;
      const themes = themeNames(options.themes);
      const w = themes === null ? null : ensureWorker();
      if (w === null || themes === null) {
        counts.fallbacks += 1;
        return base.highlight(options, callback);
      }
      const incomplete = options.isIncomplete === true;
      const key = `${options.language}\u0000${themes[0]}\u0000${themes[1]}\u0000${incomplete ? "1" : "0"}\u0000${options.code}`;
      const hit = cache.get(key);
      if (hit !== undefined) {
        counts.cacheHits += 1;
        return hit;
      }
      const listeners = byKey.get(key);
      if (listeners !== undefined) {
        if (callback !== undefined) listeners.push(callback);
        return null;
      }
      byKey.set(key, callback === undefined ? [] : [callback]);
      const id = nextId++;
      waiting.set(id, { key, options, cache: !incomplete });
      counts.posted += 1;
      w.postMessage({ id, code: options.code, language: options.language, themes, isIncomplete: incomplete });
      return null;
    },
  };
}

/** Browser composition: a module Worker running ./shiki-highlight.worker.ts. */
export function browserHighlightWorker(): HighlightWorker | null {
  if (typeof Worker === "undefined") return null;
  return new Worker(new URL("./shiki-highlight.worker.ts", import.meta.url), { type: "module", name: "km-shiki" }) as unknown as HighlightWorker;
}
