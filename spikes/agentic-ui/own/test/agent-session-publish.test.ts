/**
 * Gate 16.1 at the use-case level: with requestAnimationFrame paused, streamed
 * text still reaches the LiveTextBuffer within the publish deadline, and
 * boundary events still commit to the store once per microtask (unchanged).
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { AgentSession } from "../src/application/agent-session.ts";
import { Announcer } from "../src/application/announcer.ts";
import { LiveTextBuffer } from "../src/application/live-text-buffer.ts";
import type { AgUiTransport, StreamSink, TranscriptStore, TransportOutcome } from "../src/application/ports.ts";
import type { PublishClock } from "../src/application/publish-scheduler.ts";
import type { TranscriptState } from "../src/domain/transcript-model.ts";

interface Harness {
  readonly session: AgentSession;
  readonly live: LiveTextBuffer;
  readonly commits: string[];
  sink(): StreamSink;
  finish(): void;
}

/** rAF never fires: the window's frames are paused for the whole test. */
const pausedFrameClock = (hidden: () => boolean): PublishClock => ({
  now: () => Date.now(),
  requestFrame: () => () => undefined,
  setTimer: (ms, fn) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
  postTask: (fn) => {
    const id = setTimeout(fn, 0);
    return () => clearTimeout(id);
  },
  isHidden: hidden,
  onVisibilityChange: () => () => undefined,
});

function harness(hidden = false): Harness {
  let sink: StreamSink | null = null;
  let resolveRun: ((o: TransportOutcome) => void) | null = null;
  const transport: AgUiTransport = {
    run: (_body, s) => {
      sink = s;
      return new Promise((resolve) => {
        resolveRun = resolve;
      });
    },
  };
  const commits: string[] = [];
  const store: TranscriptStore = {
    commit: (_state: TranscriptState, reason) => {
      commits.push(reason);
    },
    projectSharedState: () => undefined,
    commitCount: () => commits.length,
    resetCommitCount: () => undefined,
    snapshot: () => null,
  };
  const live = new LiveTextBuffer();
  const session = new AgentSession({
    threadId: "t",
    transport,
    store,
    a2ui: { sync: () => undefined, snapshot: () => [] },
    scheduler: {
      now: () => Date.now(),
      after: (ms, fn) => {
        const id = setTimeout(fn, ms);
        return () => clearTimeout(id);
      },
    },
    publishClock: pausedFrameClock(() => hidden),
    publishDeadlineMs: 50,
    live,
    announcer: new Announcer(() => Date.now()),
    reduceContext: { classifyCustom: (name, value) => ({ name, rendering: "fallback", value }) },
  });
  return {
    session,
    live,
    commits,
    sink: () => {
      if (sink === null) throw new Error("run not started");
      return sink;
    },
    finish: () => resolveRun?.({ kind: "completed" }),
  };
}

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

beforeEach(() => mock.timers.enable({ apis: ["setTimeout", "Date"], now: 5_000_000 }));
afterEach(() => mock.timers.reset());

async function startStreaming(h: Harness): Promise<void> {
  void h.session.submit("hello");
  await flushMicrotasks();
  h.sink().onEvent({ type: "RUN_STARTED", threadId: "t", runId: "r" });
  h.sink().onEvent({ type: "TEXT_MESSAGE_START", messageId: "m", role: "assistant" });
  await flushMicrotasks();
}

test("rAF paused: the first token is published within the deadline", async () => {
  const h = harness();
  await startStreaming(h);
  h.sink().onEvent({ type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "Hello" });
  assert.equal(h.live.get("m"), undefined);
  mock.timers.tick(50);
  assert.equal(h.live.get("m"), "Hello");
  assert.equal(h.session.publishStats().byTrigger.deadline, 1);
});

test("rAF paused: a steady stream keeps publishing (bounded lag, no stall)", async () => {
  const h = harness();
  await startStreaming(h);
  let expected = "";
  for (let i = 0; i < 40; i += 1) {
    expected += `w${i} `;
    h.sink().onEvent({ type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: `w${i} ` });
    mock.timers.tick(25);
  }
  mock.timers.tick(100);
  assert.equal(h.live.get("m"), expected);
  const stats = h.session.publishStats();
  assert.ok(stats.flushes >= 10, `flushes ${stats.flushes}`);
  assert.ok(stats.maxLagMs <= 50, `max lag ${stats.maxLagMs}`);
});

test("hidden page: deltas publish on the next task", async () => {
  const h = harness(true);
  await startStreaming(h);
  h.sink().onEvent({ type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "Hi" });
  mock.timers.tick(0);
  assert.equal(h.live.get("m"), "Hi");
  assert.equal(h.session.publishStats().byTrigger["hidden-task"], 1);
});

test("boundary commits are unchanged: deltas never commit, boundaries commit once per microtask", async () => {
  const h = harness();
  await startStreaming(h);
  const before = h.commits.length;
  for (let i = 0; i < 20; i += 1) h.sink().onEvent({ type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "x" });
  await flushMicrotasks();
  mock.timers.tick(200);
  assert.equal(h.commits.length, before, "deltas inside the checkpoint window do not commit");
  h.sink().onEvent({ type: "TEXT_MESSAGE_END", messageId: "m" });
  h.sink().onEvent({ type: "RUN_FINISHED", threadId: "t", runId: "r" });
  await flushMicrotasks();
  assert.equal(h.commits.length, before + 1, "two boundary events in one chunk are one commit");
  h.finish();
  await flushMicrotasks();
  assert.equal(h.session.current().runStatus, "finished");
  const timing = h.session.runTiming();
  assert.ok(timing.startedAt !== null && timing.settledAt !== null && timing.settledAt >= timing.startedAt);
});
