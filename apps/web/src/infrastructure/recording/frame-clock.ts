// TJ-ARCH-MOB-001 compliant

export interface FrameClock {
  stop(): void;
}

/**
 * Calls `onFrame` about `fps` times a second until stopped. Driven by a worker timer so
 * frames keep coming while the tab is in the background; falls back to a page timer where
 * a worker cannot start.
 */
export function startFrameClock(fps: number, onFrame: () => void): FrameClock {
  const interval = Math.round(1000 / fps);
  let worker: Worker | null = null;
  let fallback: ReturnType<typeof setInterval> | null = null;
  try {
    worker = new Worker(new URL("./frame-tick-worker.ts", import.meta.url), {
      type: "module",
      name: "know-meet-recording-clock",
    });
    worker.addEventListener("message", onFrame);
    worker.addEventListener("error", () => {
      worker?.terminate();
      worker = null;
      fallback ??= setInterval(onFrame, interval);
    });
    worker.postMessage(interval);
  } catch {
    worker = null;
    fallback = setInterval(onFrame, interval);
  }
  return {
    stop: () => {
      worker?.postMessage("stop");
      worker?.terminate();
      worker = null;
      if (fallback !== null) clearInterval(fallback);
      fallback = null;
    },
  };
}
