// TJ-ARCH-MOB-001 compliant
// settings.html `checksList` / `runChecks`: each step runs for ~850ms, the first
// failure marks the rest Skipped. Static: `fail()` decides the outcome locally.
import { useCallback, useState } from "react";
import type { CheckRowState, CheckStep } from "../domain/settings";
import { useLater } from "./use-static-delay";

export interface ChecksResult {
  readonly ok: boolean;
  readonly at?: number;
  readonly error?: string;
}

const STEP_MS = 850;

function initialRows(steps: readonly CheckStep[]): readonly CheckRowState[] {
  return steps.map((step) => ({ state: "wait", text: step.initial ?? "Waiting", detail: step.detail }));
}

export function useStagedChecks(steps: readonly CheckStep[], preset?: readonly CheckRowState[]) {
  const [rows, setRows] = useState<readonly CheckRowState[]>(() => preset ?? initialRows(steps));
  const later = useLater();

  const setRow = useCallback((index: number, row: Partial<CheckRowState>) => {
    setRows((current) => current.map((item, i) => (i === index ? { ...item, ...row } : item)));
  }, []);

  const run = useCallback(
    (onDone: (result: ChecksResult) => void) => {
      setRows(steps.map((step) => ({ state: "wait", text: "Waiting", detail: step.detail })));
      const next = (index: number) => {
        const step = steps[index];
        if (step === undefined) {
          onDone({ ok: true });
          return;
        }
        setRow(index, { state: "run", text: "Checking…" });
        later(STEP_MS, () => {
          const error = step.fail?.() ?? null;
          if (error !== null) {
            setRows((current) =>
              current.map((item, i) => {
                if (i === index) return { ...item, state: "fail", text: "Failed", detail: error };
                return i > index ? { ...item, state: "skip", text: "Skipped" } : item;
              }),
            );
            onDone({ ok: false, at: index, error });
            return;
          }
          setRow(index, { state: "ok", text: step.okText ?? "Passed" });
          next(index + 1);
        });
      };
      next(0);
    },
    [steps, later, setRow],
  );

  return { rows, run };
}
