/**
 * Gate 16.3 follow-up: the Worker-backed Streamdown highlighter never highlights on the main
 * thread while the worker works, keeps Streamdown's sync-or-callback contract, coalesces
 * identical requests, caches only complete blocks, and falls back to the main-thread plugin when
 * no worker can be created or the worker fails. Also: the entity-graph 4.4.0 live-layer overlay.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CodeHighlighterPlugin, HighlightResult } from "@streamdown/code";
import { createWorkerCodeHighlighter, type HighlightReply, type HighlightRequest, type HighlightWorker } from "../src/infrastructure/worker-code-highlighter.ts";
import { LiveTextBuffer } from "../src/application/live-text-buffer.ts";
import { EntityGraphLiveText } from "../src/infrastructure/entity-graph-live-text.ts";

const THEMES = ["github-light", "github-dark"] as never;
const result = (code: string): HighlightResult => ({ tokens: [[{ content: code, offset: 0 }]], fg: "#000", bg: "#fff" }) as unknown as HighlightResult;

function fakeBase(): CodeHighlighterPlugin & { calls: number } {
  const base = {
    calls: 0,
    name: "shiki" as const,
    type: "code-highlighter" as const,
    supportsLanguage: (l: string) => l === "ts",
    getSupportedLanguages: () => ["ts"] as never,
    getThemes: () => THEMES,
    highlight: (o: { code: string }, cb?: (r: HighlightResult) => void) => {
      base.calls += 1;
      cb?.(result(`base:${o.code}`));
      return null;
    },
  };
  return base as unknown as CodeHighlighterPlugin & { calls: number };
}

function fakeWorker(): HighlightWorker & { sent: HighlightRequest[]; reply(r: HighlightReply): void; fail(): void; terminated: boolean } {
  const w = {
    sent: [] as HighlightRequest[],
    terminated: false,
    onmessage: null as HighlightWorker["onmessage"],
    onerror: null as HighlightWorker["onerror"],
    postMessage(r: HighlightRequest) {
      w.sent.push(r);
    },
    terminate() {
      w.terminated = true;
    },
    reply(r: HighlightReply) {
      w.onmessage?.({ data: r });
    },
    fail() {
      w.onerror?.(new Error("boom"));
    },
  };
  return w;
}

test("highlight posts to the worker, returns null, and calls back with the worker result", () => {
  const base = fakeBase();
  const w = fakeWorker();
  const hl = createWorkerCodeHighlighter(base, () => w);
  let got: HighlightResult | null = null;
  assert.equal(hl.highlight({ code: "let a", language: "ts" as never, themes: THEMES }, (r) => (got = r)), null);
  assert.equal(w.sent.length, 1);
  assert.equal(base.calls, 0, "the main-thread plugin never highlights");
  w.reply({ id: w.sent[0]!.id, result: result("let a") });
  assert.deepEqual(got, result("let a"));
});

test("complete blocks are cached and returned synchronously; streaming blocks are not cached", () => {
  const w = fakeWorker();
  const hl = createWorkerCodeHighlighter(fakeBase(), () => w);
  hl.highlight({ code: "x", language: "ts" as never, themes: THEMES }, () => undefined);
  w.reply({ id: w.sent[0]!.id, result: result("x") });
  assert.deepEqual(hl.highlight({ code: "x", language: "ts" as never, themes: THEMES }), result("x"));
  hl.highlight({ code: "y", language: "ts" as never, themes: THEMES, isIncomplete: true }, () => undefined);
  w.reply({ id: w.sent[1]!.id, result: result("y") });
  assert.equal(hl.highlight({ code: "y", language: "ts" as never, themes: THEMES, isIncomplete: true }, () => undefined), null);
  assert.equal(w.sent.length, 3);
  assert.equal(hl.stats().cacheHits, 1);
});

test("identical in-flight requests are posted once and all callbacks fire", () => {
  const w = fakeWorker();
  const hl = createWorkerCodeHighlighter(fakeBase(), () => w);
  const seen: string[] = [];
  hl.highlight({ code: "z", language: "ts" as never, themes: THEMES }, () => seen.push("a"));
  hl.highlight({ code: "z", language: "ts" as never, themes: THEMES }, () => seen.push("b"));
  assert.equal(w.sent.length, 1);
  w.reply({ id: w.sent[0]!.id, result: result("z") });
  assert.deepEqual(seen, ["a", "b"]);
});

test("the worker is created lazily, on the first highlight", () => {
  let created = 0;
  const hl = createWorkerCodeHighlighter(fakeBase(), () => (created++, fakeWorker()));
  assert.equal(hl.supportsLanguage("ts" as never), true);
  assert.equal(created, 0);
  hl.highlight({ code: "q", language: "ts" as never, themes: THEMES }, () => undefined);
  hl.highlight({ code: "r", language: "ts" as never, themes: THEMES }, () => undefined);
  assert.equal(created, 1);
});

test("without a worker every call falls back to the main-thread plugin", () => {
  const base = fakeBase();
  const hl = createWorkerCodeHighlighter(base, () => null);
  let got: HighlightResult | null = null;
  hl.highlight({ code: "f", language: "ts" as never, themes: THEMES }, (r) => (got = r));
  assert.equal(base.calls, 1);
  assert.deepEqual(got, result("base:f"));
});

test("a worker error hands waiting requests to the main-thread plugin and stops using the worker", () => {
  const base = fakeBase();
  const w = fakeWorker();
  const hl = createWorkerCodeHighlighter(base, () => w);
  let got: HighlightResult | null = null;
  hl.highlight({ code: "e", language: "ts" as never, themes: THEMES }, (r) => (got = r));
  w.fail();
  assert.equal(w.terminated, true);
  assert.deepEqual(got, result("base:e"));
  hl.highlight({ code: "e2", language: "ts" as never, themes: THEMES }, () => undefined);
  assert.equal(w.sent.length, 1);
  assert.equal(base.calls, 2);
});

test("LiveTextBuffer on the entity-graph live layer publishes, notifies and clears", () => {
  const overlay = new EntityGraphLiveText();
  const live = new LiveTextBuffer(overlay);
  let notified = 0;
  const off = live.subscribe("m1", () => notified++);
  live.stage("m1", "Hel");
  assert.equal(live.get("m1"), undefined, "staged text is not visible before publish");
  live.publish();
  assert.equal(live.get("m1"), "Hel");
  live.stage("m1", "Hello");
  live.publish();
  assert.equal(live.get("m1"), "Hello");
  assert.ok(notified >= 2);
  live.retain(() => false);
  assert.equal(live.get("m1"), undefined);
  assert.deepEqual(overlay.ids(), []);
  off();
});
