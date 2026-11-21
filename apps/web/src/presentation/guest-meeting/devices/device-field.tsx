// TJ-ARCH-MOB-001 compliant
// One device picker (device-settings shape, sections 5 and 6; DS-1, DS-7, DS-8): a visible
// label bound to a native <select> (the OS list reads long device names best), then one
// line under it, the hint or the error. Native selects are 48px tall on `control`, focus is
// the `focus` fill (kit NativeSelect, Flat 2.0). Modes:
// - ready: lists the devices; a change switches at once (no Apply).
// - locked: before permission. aria-disabled, still focusable, described by the hint; it
//   ignores changes and does not open.
// - none: no device of this kind. Disabled, one option "No <kind> found", with the hint.
// A failed switch sets aria-invalid (the `control-invalid` fill) and the error line, which
// carries an alert icon so the state is never colour alone.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import type * as React from "react";
import type { DeviceOption } from "./device-options";

export type DeviceFieldMode = "ready" | "locked" | "none";

interface DeviceFieldProps {
  readonly id: string;
  readonly label: string;
  readonly mode: DeviceFieldMode;
  readonly options: readonly DeviceOption[];
  /** The option shown; empty when nothing is listed. */
  readonly value: string;
  /** Shown when the list is empty (before the browser lists devices, or none found). */
  readonly emptyOption: string;
  readonly hint: string | null;
  readonly error: string | null;
  readonly onChange: (value: string) => void;
  readonly testId?: string;
}

/** Keys that would move a native select's value or open it while it is locked. */
const LOCKED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  " ",
  "Enter",
]);

export function DeviceField({
  id,
  label,
  mode,
  options,
  value,
  emptyOption,
  hint,
  error,
  onChange,
  testId,
}: DeviceFieldProps) {
  const locked = mode === "locked";
  const lineId = `${id}-line`;
  const line = error ?? hint;
  const listed = mode === "ready" && options.length > 0;

  const guard = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (locked && LOCKED_KEYS.has(event.key)) event.preventDefault();
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <NativeSelect
        id={id}
        data-testid={testId}
        value={listed ? value : ""}
        disabled={mode === "none"}
        aria-disabled={locked ? true : undefined}
        aria-invalid={error === null ? undefined : true}
        aria-describedby={line === null ? undefined : lineId}
        onKeyDown={guard}
        onMouseDown={(event) => {
          if (locked) event.preventDefault();
        }}
        onChange={(event) => {
          if (!locked) onChange(event.target.value);
        }}
        className="has-[select[aria-disabled=true]]:opacity-50"
      >
        {listed ? (
          options.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))
        ) : (
          <NativeSelectOption value="">{emptyOption}</NativeSelectOption>
        )}
      </NativeSelect>
      {line === null ? null : (
        <p
          id={lineId}
          className={
            error === null
              ? "text-sm text-muted-foreground"
              : "flex items-start gap-1.5 text-sm text-red-text"
          }
        >
          {error === null ? null : <KmIcon name="alert" className="mt-0.5 size-4 flex-none" />}
          <span>{line}</span>
        </p>
      )}
    </div>
  );
}
