// TJ-ARCH-MOB-001 compliant
// settings.html `field()`, `selectField()`, `switchRow()`, `checkRow()`,
// `radioGroup()` and `segField()` on kit controls. Errors render only after a
// submit (forms own validation; F6 moves focus to the first invalid field) and
// are tied to the control with aria-invalid + aria-describedby.
import { Button } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { FieldError } from "@know-meet/ui/components/field";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { RadioGroup, RadioGroupItem } from "@know-meet/ui/components/radio-group";
import { Switch } from "@know-meet/ui/components/switch";
import { Textarea } from "@know-meet/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@know-meet/ui/components/toggle-group";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useId, useState } from "react";
import { copyText } from "../../shared/copy-text";

function describedBy(...ids: readonly (string | false | undefined)[]): string | undefined {
  const list = ids.filter((id): id is string => typeof id === "string");
  return list.length === 0 ? undefined : list.join(" ");
}

function FieldLabelText({ htmlFor, label, required, optional }: {
  readonly htmlFor: string;
  readonly label: string;
  readonly required?: boolean;
  readonly optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold">
      {label}
      {required === true ? <span aria-hidden="true" className="text-ember-text">{" *"}</span> : null}
      {optional === true ? <span className="font-regular text-muted-foreground"> (optional)</span> : null}
    </label>
  );
}

function Hint({ id, children }: { readonly id: string; readonly children: React.ReactNode }) {
  return (
    <p id={id} className="text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onValueChange?: (value: string) => void;
  readonly error?: string | null;
  readonly hint?: React.ReactNode;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly kind?: "text" | "password" | "tel" | "textarea";
  /** Monospace value (URLs, keys, IDs). */
  readonly mono?: boolean;
  /** Adds a copy button after the control (read-only values). */
  readonly copyable?: boolean;
  readonly readOnly?: boolean;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly maxLength?: number;
  readonly rows?: number;
  readonly className?: string;
}

/** settings.html `field(o)`. */
export function TextField(props: TextFieldProps) {
  const { id, label, value, onValueChange, error, hint, required, optional, kind = "text", mono, copyable, readOnly } = props;
  const [revealed, setRevealed] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-err`;
  const hasError = typeof error === "string" && error !== "";
  const shared = {
    id,
    value,
    readOnly,
    placeholder: props.placeholder,
    maxLength: props.maxLength,
    "aria-required": required === true ? true : undefined,
    "aria-invalid": hasError ? true : undefined,
    "aria-describedby": describedBy(hint !== undefined && hintId, hasError && errorId),
    spellCheck: mono === true || kind === "password" ? false : undefined,
    className: cn(mono === true && "font-mono text-13"),
  } as const;
  const control =
    kind === "textarea" ? (
      <Textarea {...shared} rows={props.rows ?? 3} onChange={(event) => onValueChange?.(event.target.value)} />
    ) : (
      <Input
        {...shared}
        type={kind === "password" ? (revealed ? "text" : "password") : kind}
        autoComplete={props.autoComplete ?? (kind === "password" ? "new-password" : "off")}
        inputMode={props.inputMode}
        onChange={(event) => onValueChange?.(event.target.value)}
      />
    );
  return (
    <div className={cn("grid min-w-0 gap-1.5", props.className)}>
      <FieldLabelText htmlFor={id} label={label} required={required} optional={optional} />
      {hint === undefined ? null : <Hint id={hintId}>{hint}</Hint>}
      {kind === "password" ? (
        <InputGroup>
          {control}
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={revealed}
            aria-label={`${revealed ? "Hide" : "Show"} ${label}`}
            onClick={() => setRevealed((shown) => !shown)}
          >
            <KmIcon name={revealed ? "eye-off" : "eye"} />
          </Button>
        </InputGroup>
      ) : copyable === true ? (
        <InputGroup>
          {control}
          <Button variant="ghost" size="icon" aria-label={`Copy ${label}`} onClick={() => void copyText(value)}>
            <KmIcon name="copy" />
          </Button>
        </InputGroup>
      ) : (
        control
      )}
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

/** km.css `.input-group`: a control plus a trailing button. */
export function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2", className)} {...props} />;
}

export interface SelectFieldProps {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly (readonly [string, string])[];
  readonly onValueChange?: (value: string) => void;
  readonly hint?: React.ReactNode;
  readonly required?: boolean;
  readonly disabled?: boolean;
}

/** settings.html `selectField(o)` on the kit native select. */
export function SelectField({ id, label, value, options, onValueChange, hint, required, disabled }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = `${selectId}-hint`;
  return (
    <div className="grid min-w-0 gap-1.5">
      <FieldLabelText htmlFor={selectId} label={label} required={required} />
      {hint === undefined ? null : <Hint id={hintId}>{hint}</Hint>}
      <NativeSelect
        id={selectId}
        value={value}
        disabled={disabled}
        aria-describedby={hint === undefined ? undefined : hintId}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <NativeSelectOption key={optionValue} value={optionValue}>
            {optionLabel}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

/** settings.html `switchRow(o)`: label and description, the switch at the end. */
export function SwitchRow({ label, description, checked, onCheckedChange, disabled }: {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s4 py-s3">
      <label htmlFor={id} className="grid cursor-pointer gap-0.5">
        <b className="font-semibold">{label}</b>
        {description === undefined ? null : (
          <span id={`${id}-d`} className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={description === undefined ? undefined : `${id}-d`}
        onCheckedChange={(next) => onCheckedChange?.(next)}
      />
    </div>
  );
}

/** km.css `.check-row` with a kit checkbox. */
export function CheckRow({ id, label, description, checked, onCheckedChange }: {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-size-target items-start gap-s3 py-s2">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onCheckedChange(next)} className="mt-0.5" />
      <label htmlFor={id} className="grid cursor-pointer gap-0.5">
        <span className="font-semibold">{label}</span>
        {description === undefined ? null : <span className="text-sm text-muted-foreground">{description}</span>}
      </label>
    </div>
  );
}

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

/** settings.html `radioGroup(legend, …)`: a fieldset of radio rows. */
export function RadioChoices({ name, legend, options, value, onValueChange }: {
  readonly name: string;
  readonly legend: string;
  readonly options: readonly ChoiceOption[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}) {
  const legendId = useId();
  return (
    <div className="grid min-w-0">
      <span id={legendId} className="mb-1.5 text-sm font-semibold">
        {legend}
      </span>
      <RadioGroup aria-labelledby={legendId} value={value} onValueChange={(next) => onValueChange(String(next))} className="gap-0">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex min-h-size-target items-start gap-s3 py-s2">
              <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
              <label htmlFor={id} className="grid cursor-pointer gap-0.5">
                <span className="font-semibold">{option.label}</span>
                {option.description === undefined ? null : (
                  <span className="text-sm text-muted-foreground">{option.description}</span>
                )}
              </label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

export interface SegmentOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: KmIconName;
}

/** settings.html `segField(label, …)`: a labelled segmented control (single choice). */
export function SegmentField({ label, options, value, onValueChange, disabled }: {
  readonly label: string;
  readonly options: readonly SegmentOption[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <span id={labelId} className="text-sm font-semibold">
        {label}
      </span>
      <div>
        <ToggleGroup
          aria-labelledby={labelId}
          value={[value]}
          disabled={disabled}
          onValueChange={(next) => {
            const picked = next[0];
            if (typeof picked === "string") onValueChange(picked);
          }}
        >
          {options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.icon === undefined ? null : <KmIcon name={option.icon} className="size-4" />}
              <span>{option.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
