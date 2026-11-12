// TJ-ARCH-MOB-001 compliant
// One validated text field. Validation never runs mid-typing: it runs on blur
// (once the field has a value or already shows an error, as the prototype does)
// and on submit. A failed submit moves focus to the first invalid field (F6) via
// `submitForm`, after the errors have rendered.
import type * as React from "react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { focusFirstError } from "../shared/focus-first-error";

export interface FieldState {
  readonly value: string;
  readonly error: string;
  readonly setValue: (value: string) => void;
  readonly setError: (error: string) => void;
  /** Runs the validator on the trimmed value; true when valid. */
  readonly check: () => boolean;
  readonly inputProps: {
    readonly value: string;
    readonly onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    readonly onBlur: () => void;
    readonly "aria-invalid": true | undefined;
  };
}

export function useField(
  validate: (value: string) => string,
  initialValue = "",
  initialError = "",
): FieldState {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(initialError);
  const check = () => {
    const next = validate(value.trim());
    setError(next);
    return next === "";
  };
  return {
    value,
    error,
    setValue,
    setError,
    check,
    inputProps: {
      value,
      onChange: (event) => setValue(event.target.value),
      onBlur: () => {
        if (value.trim() !== "" || error !== "") check();
      },
      "aria-invalid": error === "" ? undefined : true,
    },
  };
}

/**
 * Runs every check synchronously so the error state is in the DOM, then focuses
 * the first `aria-invalid` control. Returns true when the form is valid.
 */
export function submitForm(
  form: HTMLFormElement | null,
  checks: readonly (() => boolean)[],
): boolean {
  let valid = true;
  flushSync(() => {
    for (const check of checks) valid = check() && valid;
  });
  if (!valid) focusFirstError(form);
  return valid;
}
