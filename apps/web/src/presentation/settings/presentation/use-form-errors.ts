// TJ-ARCH-MOB-001 compliant
// Submit-time validation (F6, decision log 16.4): errors appear only after a
// submit, focus then moves to the first invalid field so screen readers announce
// it, and an error clears as soon as its field becomes valid (no new errors while
// typing).
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { focusFirstError } from "../../shared/focus-first-error";
import { checkField, type FieldRule } from "../application/validators";

// A mapped type: TS 7 rejects `{}` for Readonly<Partial<Record<K, …>>> over a generic K.
export type FieldErrors<K extends string> = { readonly [P in K]?: string | null };

export function useFormErrors<K extends string>(rules: Readonly<Record<K, FieldRule>>) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors<K>>({});
  const [attempt, setAttempt] = useState(0);

  useLayoutEffect(() => {
    if (attempt > 0) focusFirstError(formRef.current);
  }, [attempt]);

  /** Validates every listed field; returns true when all pass. */
  const validate = useCallback(
    (
      values: Readonly<Record<K, string>>,
      keys: readonly K[] = Object.keys(rules) as K[],
    ): boolean => {
      const next: Partial<Record<K, string | null>> = {};
      for (const key of keys) next[key] = checkField(rules[key], values[key]);
      setErrors(next);
      const ok = keys.every((key) => next[key] === null);
      if (!ok) setAttempt((n) => n + 1);
      return ok;
    },
    [rules],
  );

  /** Call on change: drops a field's error once its value passes. */
  const revalidate = useCallback(
    (key: K, value: string) => {
      setErrors((current) => {
        const existing = current[key];
        if (existing === undefined || existing === null) return current;
        return checkField(rules[key], value) === null ? { ...current, [key]: null } : current;
      });
    },
    [rules],
  );

  /** Sets one error from outside the rules (e.g. a rejected password), then focuses it. */
  const setError = useCallback((key: K, message: string) => {
    setErrors((current) => ({ ...current, [key]: message }));
    setAttempt((n) => n + 1);
  }, []);

  return { formRef, errors, validate, revalidate, setError };
}
