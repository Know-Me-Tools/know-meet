// TJ-ARCH-MOB-001 compliant
// Simulated async work for static screens (prototype `setTimeout` + `busy()`):
// marks a key busy, runs `done` after `ms`, and clears pending timers on unmount.
import { useCallback, useEffect, useRef, useState } from "react";

export function useBusyTimer(): {
  readonly busy: ReadonlySet<string>;
  readonly run: (key: string, ms: number, done: () => void) => void;
} {
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
    };
  }, []);

  const run = useCallback((key: string, ms: number, done: () => void) => {
    setBusy((current) => new Set(current).add(key));
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      setBusy((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      done();
    }, ms);
    timers.current.add(id);
  }, []);

  return { busy, run };
}
