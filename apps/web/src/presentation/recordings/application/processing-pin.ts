// TJ-ARCH-MOB-001 compliant
// Deterministic capture pin for the recordings "processing" view (prototype RV-36):
// `?km-processing-pin=N` (query before the hash) or `html[data-km-processing-pin=N]`
// freezes the pipeline with N steps done, step N at 50% in progress and the rest
// waiting; N = step count is the finished state. Pure: callers pass the raw value.
import type { ProcessingStep } from "../domain/recording-details";

export const PROCESSING_PIN_PARAM = "km-processing-pin";

export type PinStepState = "wait" | "run" | "ok";

export interface PinnedProgress {
  readonly percent: number;
  readonly steps: readonly { readonly state: PinStepState; readonly fraction: number }[];
  readonly active: number;
  readonly complete: boolean;
}

/** Parses the raw pin value; null when absent or not an integer in 0..stepCount. */
export function parseProcessingPin(
  raw: string | null | undefined,
  stepCount: number,
): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= stepCount ? value : null;
}

export function pinnedProgress(steps: readonly ProcessingStep[], pin: number): PinnedProgress {
  const total = steps.reduce((sum, step) => sum + step.durationMs, 0);
  const doneMs = steps.slice(0, pin).reduce((sum, step) => sum + step.durationMs, 0);
  const current = steps[pin];
  const percent =
    current === undefined || total === 0
      ? 100
      : Math.round(((doneMs + current.durationMs / 2) / total) * 100);
  return {
    percent,
    steps: steps.map((_, index) =>
      index < pin
        ? { state: "ok" as const, fraction: 1 }
        : index === pin
          ? { state: "run" as const, fraction: 0.5 }
          : { state: "wait" as const, fraction: 0 },
    ),
    active: pin,
    complete: pin >= steps.length,
  };
}
