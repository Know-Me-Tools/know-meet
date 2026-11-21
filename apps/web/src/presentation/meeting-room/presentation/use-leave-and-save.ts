// TJ-ARCH-MOB-001 compliant
// Leave, then wait for this device's history of the meeting to be saved (WC-7). `leave()`
// already ends the history session and waits for its writes; the room view used to drop
// that promise, so "You left the meeting" appeared while the last message and the end time
// were still being written, and a reload or a closed tab in that moment lost them (hosted
// run 2026-11-21, evidence/wc7-diag-2026-11-21). While `saving` is true the end view shows a
// saving line instead of its actions. A storage stall never traps the person: after
// SAVE_WAIT_MS the end view is offered anyway. The wait is long because a first meeting in
// WebKit measured about 3.3 s to create the store and about 0.5 s per write (probe
// 2026-11-21, evidence/wc7-diag-2026-11-21/probe), so 5 s cut normal saves short.
import { useCallback, useState } from "react";

const SAVE_WAIT_MS = 15_000;

interface Leaver {
  leave(): Promise<void>;
}

export function useLeaveAndSave(useCases: Leaver): {
  readonly saving: boolean;
  readonly leave: () => void;
} {
  const [saving, setSaving] = useState(false);
  const leave = useCallback(() => {
    setSaving(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const capped = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SAVE_WAIT_MS);
    });
    const left = useCases.leave().catch((error: unknown) => {
      // biome-ignore lint/suspicious/noConsole: the only record of a failed leave
      console.error("[know-meet] leave failed", error);
    });
    void Promise.race([left, capped]).finally(() => {
      clearTimeout(timer);
      setSaving(false);
    });
  }, [useCases]);
  return { saving, leave };
}
