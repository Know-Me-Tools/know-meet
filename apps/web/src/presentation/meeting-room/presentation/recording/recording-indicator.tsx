// TJ-ARCH-MOB-001 compliant
// meet.html `.rec-ind` (wc10 task 10.4, WC-8, WC-9): the recording notice in the room
// head, shown to every participant while a recording runs or starts anywhere in the
// room (`indicatorOn`) and to nobody otherwise (scenario contract
// `km-recording-indicator`). A `red-soft` pill with the `pip-red` pip, the word
// "Recording" (state is never colour alone) and the time since this page saw it start.
// The pip does not blink: no motion to opt out of. Its appearance is announced once by
// the room's status region, so the pill itself is not a live region.
import { useEffect, useState } from "react";
import { formatDuration } from "../../../workspace/application/format";
import { RECORD_COPY } from "./recording-copy";

const TICK_MS = 1000;

function useElapsed(): number {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now - startedAt;
}

export function RecordingIndicator({ recorder }: { readonly recorder: string }) {
  const elapsed = useElapsed();
  return (
    <span
      data-testid="km-recording-indicator"
      title={`${RECORD_COPY.indicatorName} by ${recorder}`}
      className="inline-flex min-h-8 flex-none items-center gap-1.5 rounded-pill bg-red-soft px-2.5 text-xs font-semibold whitespace-nowrap text-foreground"
    >
      <span aria-hidden="true" className="size-size-pip flex-none rounded-round bg-pip-red" />
      <span>{RECORD_COPY.indicator}</span>
      <span className="sr-only">, by {recorder}</span>
      <span aria-hidden="true" className="font-mono tabular-nums max-bp481:hidden">
        {formatDuration(elapsed)}
      </span>
    </span>
  );
}
