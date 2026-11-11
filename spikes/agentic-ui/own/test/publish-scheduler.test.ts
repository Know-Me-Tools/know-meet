/**
 * Gate 16.1: the publish scheduler stays bounded when requestAnimationFrame is
 * throttled or paused. Node's mock timers drive setTimeout and Date; frames and
 * MessageChannel tasks are manual queues so a test can pause them.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { PublishScheduler, type PublishClock } from "../src/application/publish-scheduler.ts";

interface FakeClock extends PublishClock {
  hidden: boolean;
  /** Runs queued frame callbacks (one display refresh). */
  frame(): void;
  /** Runs queued MessageChannel-style tasks. */
  drainTasks(): void;
  setHidden(hidden: boolean): void;
  pendingFrames(): number;
}

function fakeClock(): FakeClock {
  let frames: { fn: () => void; live: boolean }[] = [];
  let tasks: { fn: () => void; live: boolean }[] = [];
  const visibility = new Set<() => void>();
  const clock: FakeClock = {
    hidden: false,
    now: () => Date.now(),
    requestFrame: (fn) => {
      const entry = { fn, live: true };
      frames.push(entry);
      return () => {
        entry.live = false;
      };
    },
    setTimer: (ms, fn) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
    postTask: (fn) => {
      const entry = { fn, live: true };
      tasks.push(entry);
      return () => {
        entry.live = false;
      };
    },
    isHidden: () => clock.hidden,
    onVisibilityChange: (fn) => {
      visibility.add(fn);
      return () => visibility.delete(fn);
    },
    frame: () => {
      const due = frames;
      frames = [];
      for (const f of due) if (f.live) f.fn();
    },
    drainTasks: () => {
      while (tasks.length > 0) {
        const due = tasks;
        tasks = [];
        for (const t of due) if (t.live) t.fn();
      }
    },
    setHidden: (hidden) => {
      clock.hidden = hidden;
      for (const fn of visibility) fn();
    },
    pendingFrames: () => frames.filter((f) => f.live).length,
  };
  return clock;
}

let clock: FakeClock;
let flushes: number[];

beforeEach(() => {
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 });
  clock = fakeClock();
  flushes = [];
});

afterEach(() => {
  mock.timers.reset();
});

function scheduler(deadlineMs = 50): PublishScheduler {
  return new PublishScheduler(clock, () => flushes.push(Date.now()), deadlineMs);
}

test("focused: flushes on the next frame and cancels the deadline timer", () => {
  const s = scheduler();
  s.request();
  mock.timers.tick(16);
  clock.frame();
  assert.equal(flushes.length, 1);
  mock.timers.tick(200);
  assert.equal(flushes.length, 1, "the deadline timer must not flush a second time");
  assert.deepEqual(s.readStats().byTrigger, { frame: 1, deadline: 0, "hidden-task": 0, "overdue-task": 0, "visibility-task": 0 });
});

test("rAF paused: the deadline flushes within deadlineMs", () => {
  const s = scheduler(50);
  const requestedAt = Date.now();
  s.request();
  mock.timers.tick(49);
  assert.equal(flushes.length, 0);
  mock.timers.tick(1);
  assert.deepEqual(flushes, [requestedAt + 50]);
  assert.equal(s.readStats().byTrigger.deadline, 1);
  assert.equal(s.readStats().maxLagMs, 50);
  clock.frame();
  assert.equal(flushes.length, 1, "the late frame must not flush again");
});

test("rAF paused for a whole stream: every publish stays within the bound", () => {
  const s = scheduler(50);
  const requests: number[] = [];
  for (let i = 0; i < 100; i += 1) {
    requests.push(Date.now());
    s.request();
    mock.timers.tick(10);
  }
  mock.timers.tick(50);
  assert.ok(flushes.length >= 19, `expected regular flushes, got ${flushes.length}`);
  assert.ok(s.readStats().maxLagMs <= 50);
  assert.equal(clock.pendingFrames(), 0, "cancelled frames do not pile up");
});

test("requests while a flush is pending coalesce into one flush", () => {
  const s = scheduler();
  s.request();
  s.request();
  s.request();
  clock.frame();
  assert.equal(flushes.length, 1);
});

test("hidden page: flushes on the next task, never waits for a frame", () => {
  const s = scheduler();
  clock.hidden = true;
  s.request();
  assert.equal(clock.pendingFrames(), 0);
  clock.drainTasks();
  assert.equal(flushes.length, 1);
  assert.equal(s.readStats().byTrigger["hidden-task"], 1);
});

test("becoming hidden while waiting for a frame flushes on the next task", () => {
  const s = scheduler(50);
  s.request();
  clock.setHidden(true);
  clock.drainTasks();
  assert.equal(flushes.length, 1);
  assert.equal(s.readStats().byTrigger["visibility-task"], 1);
  mock.timers.tick(100);
  clock.frame();
  assert.equal(flushes.length, 1);
});

test("timers throttled too: a request after the due time flushes on the next task", () => {
  // Model a throttled setTimeout by never advancing timers; only Date moves.
  const s = scheduler(50);
  s.request();
  mock.timers.setTime(Date.now() + 1_000);
  s.request();
  clock.drainTasks();
  assert.equal(flushes.length, 1);
  assert.equal(s.readStats().byTrigger["overdue-task"], 1);
});

test("delayed request: not before the delay, then frame-or-deadline", () => {
  const s = scheduler(50);
  const start = Date.now();
  s.request(200);
  clock.frame();
  mock.timers.tick(199);
  assert.equal(flushes.length, 0, "frames before the delay do not flush");
  mock.timers.tick(1);
  clock.frame();
  assert.deepEqual(flushes, [start + 200]);
});

test("delayed request with rAF paused flushes by delay + deadline", () => {
  const s = scheduler(50);
  const start = Date.now();
  s.request(200);
  mock.timers.tick(200); // node's mock tick does not fire a timer armed during the same tick
  mock.timers.tick(50);
  assert.deepEqual(flushes, [start + 250]);
});

test("cancel drops a pending flush; dispose stops visibility handling", () => {
  const s = scheduler();
  s.request();
  s.cancel();
  mock.timers.tick(100);
  clock.frame();
  clock.drainTasks();
  assert.equal(flushes.length, 0);
  s.request();
  s.dispose();
  clock.setHidden(true);
  clock.drainTasks();
  mock.timers.tick(100);
  assert.equal(flushes.length, 0);
});

test("rejects a non-positive deadline", () => {
  assert.throws(() => scheduler(0), RangeError);
});
