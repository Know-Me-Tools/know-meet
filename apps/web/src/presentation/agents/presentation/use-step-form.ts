// TJ-ARCH-MOB-001 compliant
// Submit-time validation for a wizard or settings form (F6): errors are computed
// only on submit (never mid-typing); an already-shown error re-checks as the field
// changes so it clears once fixed; a failed submit moves focus to the first
// invalid field so screen readers announce it with its error line.
import { type RefObject, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { focusFirstError } from "../../shared/focus-first-error";

export interface StepForm<F extends string> {
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly errorOf: (field: F) => string;
  /** Call from a field's change handler with the new value. */
  readonly recheck: (field: F, value: string) => void;
  /** Validates every field; returns true when valid, otherwise focuses the first error. */
  readonly submit: (values: Readonly<Partial<Record<F, string>>>) => boolean;
}

export function useStepForm<F extends string>(validate: (field: F, value: string) => string): StepForm<F> {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Readonly<Partial<Record<F, string>>>>({});
  return {
    formRef,
    errorOf: (field) => errors[field] ?? "",
    recheck: (field, value) => {
      if ((errors[field] ?? "") === "") return;
      setErrors((current) => ({ ...current, [field]: validate(field, value) }));
    },
    submit: (values) => {
      const next: Partial<Record<F, string>> = {};
      let valid = true;
      for (const field of Object.keys(values) as F[]) {
        const message = validate(field, values[field] ?? "");
        next[field] = message;
        if (message !== "") valid = false;
      }
      flushSync(() => setErrors(next));
      if (!valid) focusFirstError(formRef.current);
      return valid;
    },
  };
}
