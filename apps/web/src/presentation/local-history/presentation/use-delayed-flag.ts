// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §6 "Loading": the list area shows nothing for 300 ms, then
// skeleton rows, so a fast local read never flashes a placeholder.
import { useEffect, useState } from "react";

export const SKELETON_DELAY_MS = 300;

/** True once `active` has stayed true for `delayMs`; false again as soon as it is not. */
export function useDelayedFlag(active: boolean, delayMs: number = SKELETON_DELAY_MS): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => {
      window.clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delayMs]);
  return active && elapsed;
}
