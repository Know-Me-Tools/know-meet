/** Browser adapters for the Scheduler and PublishClock ports. */
import type { PublishClock } from "../application/publish-scheduler.ts";
import type { Scheduler } from "../application/ports.ts";

export const browserScheduler: Scheduler = {
  now: () => Date.now(),
  after: (ms, fn) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
};

/**
 * MessageChannel task queue: one channel, FIFO callbacks. Unlike setTimeout it is
 * not clamped or aligned by hidden-page timer throttling, and unlike
 * requestAnimationFrame it runs when no frames are produced.
 */
function createTaskPoster(): (fn: () => void) => () => void {
  const channel = new MessageChannel();
  const queue: { fn: () => void; cancelled: boolean }[] = [];
  channel.port1.onmessage = () => {
    const entry = queue.shift();
    if (entry !== undefined && !entry.cancelled) entry.fn();
  };
  return (fn) => {
    const entry = { fn, cancelled: false };
    queue.push(entry);
    channel.port2.postMessage(null);
    return () => {
      entry.cancelled = true;
    };
  };
}

export function createBrowserPublishClock(): PublishClock {
  const postTask = createTaskPoster();
  return {
    now: () => Date.now(),
    requestFrame: (fn) => {
      const id = requestAnimationFrame(() => fn());
      return () => cancelAnimationFrame(id);
    },
    setTimer: (ms, fn) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
    postTask,
    isHidden: () => document.visibilityState === "hidden",
    onVisibilityChange: (fn) => {
      document.addEventListener("visibilitychange", fn);
      return () => document.removeEventListener("visibilitychange", fn);
    },
  };
}
