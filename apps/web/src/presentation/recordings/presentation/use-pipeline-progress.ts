// TJ-ARCH-MOB-001 compliant
// Simulated post-meeting pipeline (recordings.html `renderProcessing`): starts
// 400ms after mount, then advances through each step's duration on a 100ms tick.
// Progress is state, not decoration, so it still advances under reduced motion
// (only the spinner stops).
import { useEffect, useState } from "react";
import type { ProcessingStep } from "../domain/recording-details";

const START_DELAY_MS = 400;
const TICK_MS = 100;

export type StepState = "wait" | "run" | "ok";

export interface PipelineProgress {
  /** Overall percent, 0-100. */
  readonly percent: number;
  /** Per step: state and fill fraction (0-1). */
  readonly steps: readonly { readonly state: StepState; readonly fraction: number }[];
  /** Index of the running step, -1 before start, `steps.length` when complete. */
  readonly active: number;
  readonly complete: boolean;
}

export function usePipelineProgress(steps: readonly ProcessingStep[]): PipelineProgress {
  const total = steps.reduce((sum, step) => sum + step.durationMs, 0);
  const [elapsed, setElapsed] = useState(-1);

  useEffect(() => {
    let started = 0;
    let timer = 0;
    const startTimer = window.setTimeout(() => {
      started = Date.now();
      setElapsed(0);
      timer = window.setInterval(() => {
        const next = Date.now() - started;
        setElapsed(next);
        if (next >= total) window.clearInterval(timer);
      }, TICK_MS);
    }, START_DELAY_MS);
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(timer);
    };
  }, [total]);

  let offset = 0;
  let active = elapsed < 0 ? -1 : steps.length;
  const progress = steps.map((step, index) => {
    const local = elapsed - offset;
    offset += step.durationMs;
    if (elapsed < 0 || local < 0) return { state: "wait" as const, fraction: 0 };
    if (local >= step.durationMs) return { state: "ok" as const, fraction: 1 };
    if (active === steps.length) active = index;
    return { state: "run" as const, fraction: local / step.durationMs };
  });
  const percent = elapsed <= 0 ? 0 : Math.min(100, Math.round((elapsed / total) * 100));
  return { percent, steps: progress, active, complete: elapsed >= total };
}
