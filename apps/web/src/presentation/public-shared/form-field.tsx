// TJ-ARCH-MOB-001 compliant
// km.css `.field`: label (with the visual required marker), the control, an
// optional hint and the error line, composed from the kit Field parts. The
// control is passed as children so callers keep native inputs, the password
// wrapper or a code input group; it must carry `aria-describedby={describedBy(...)}`
// so the hint and the error are announced with the field (SC 1.3.1, 3.3.1).
import { Field, FieldDescription, FieldError } from "@know-meet/ui/components/field";
import { Label } from "@know-meet/ui/components/label";
import type * as React from "react";
import { requiredMarkClass } from "./ui-classes";

export function hintId(id: string): string {
  return `${id}-hint`;
}

export function errorId(id: string): string {
  return `${id}-err`;
}

/** The `aria-describedby` value for a field: hint first, then error. */
export function describedBy(id: string, hasHint: boolean): string {
  return hasHint ? `${hintId(id)} ${errorId(id)}` : errorId(id);
}

interface FormFieldProps {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly error: string;
  readonly required?: boolean;
  readonly hint?: React.ReactNode;
  /** Sits at the end of the label row (km.css `.label-row`), e.g. "Forgot password?". */
  readonly labelExtra?: React.ReactNode;
  /** The prototype announces code-field errors immediately (`role="alert"`); auth fields do not. */
  readonly announceError?: boolean;
  readonly children: React.ReactNode;
}

export function FormField({
  id,
  label,
  error,
  required = false,
  hint,
  labelExtra,
  announceError = false,
  children,
}: FormFieldProps) {
  const labelNode = (
    <Label htmlFor={id} className="gap-0">
      {label}
      {required ? (
        <span aria-hidden="true" className={requiredMarkClass}>
          *
        </span>
      ) : null}
    </Label>
  );
  return (
    <Field>
      {labelExtra === undefined ? (
        labelNode
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-s2">
          {labelNode}
          {labelExtra}
        </div>
      )}
      {children}
      {hint === undefined ? null : <FieldDescription id={hintId(id)}>{hint}</FieldDescription>}
      <FieldError id={errorId(id)} role={announceError ? "alert" : undefined}>
        {error === "" ? null : error}
      </FieldError>
    </Field>
  );
}
