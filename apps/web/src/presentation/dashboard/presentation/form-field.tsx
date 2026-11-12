// TJ-ARCH-MOB-001 compliant
// km.css `.field` (grid, 6px gap) with a label, the control, an optional hint and
// the inline error line (icon + text, fg colour, red icon; F6/F9). The error has no
// live role: the form's error summary announces, and focus moves to the field,
// which reads its description.
import { FieldError } from "@know-meet/ui/components/field";
import { Label } from "@know-meet/ui/components/label";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";

interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: React.ReactNode;
  readonly hintId?: string;
  readonly error?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
}

/** The ids a control should list in `aria-describedby`. */
export function describedBy(id: string, error: string | undefined, hintId?: string): string | undefined {
  const ids = [hintId, error ? `${id}-err` : undefined].filter((x): x is string => x !== undefined);
  return ids.length ? ids.join(" ") : undefined;
}

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-ember-text">
      *
    </span>
  );
}

export function FormField({ id, label, required, hint, hintId, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label htmlFor={id} className="block">
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {children}
      {hint ? (
        <span id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <FieldError id={`${id}-err`} role={undefined}>
          {error}
        </FieldError>
      ) : null}
    </div>
  );
}
