// TJ-ARCH-MOB-001 compliant
// settings.html `later(ms, fn)` + `busy(btn, label)`: static stand-ins for server
// round trips (no network in this phase). Pending timers are dropped on unmount,
// like the prototype's RUN token on a route change.
import { useCallback, useEffect, useRef, useState } from "react";

export function useLater(): (ms: number, fn: () => void) => void {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);
  return useCallback((ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);
}

/** A button's busy state: `start(ms, done)` shows the busy label, then runs `done`. */
export function useBusyAction(): { readonly busy: boolean; readonly start: (ms: number, done: () => void) => void } {
  const [busy, setBusy] = useState(false);
  const later = useLater();
  const start = useCallback(
    (ms: number, done: () => void) => {
      setBusy(true);
      later(ms, () => {
        setBusy(false);
        done();
      });
    },
    [later],
  );
  return { busy, start };
}
