// TJ-ARCH-MOB-001 compliant
// Form parts for the registration wizard, agent settings and dot settings
// (agents.html `field`, `optionGroup`, `switchRow`). Labels are always visible;
// errors appear on submit (F6) as an icon + text line referenced by
// aria-describedby, and the field turns `control-invalid`. Choice cards follow
// DESIGN.md: the indicator carries state, the checked card fill is ember-soft
// (supplementary), and a focused card takes the whole `focus` fill.
import { Button } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import { RadioGroup, RadioGroupItem } from "@know-meet/ui/components/radio-group";
import { Switch } from "@know-meet/ui/components/switch";
import { Textarea } from "@know-meet/ui/components/textarea";
import { cn } from "@know-meet/ui/lib/utils";
import { useState } from "react";
import type * as React from "react";
import type { OptionCopy } from "../domain/agent-config";

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-ember-text">
      {" *"}
    </span>
  );
}

export function FormNote() {
  return (
    <p className="text-sm text-muted-foreground">
      Fields marked{" "}
      <span aria-hidden="true" className="text-ember-text">
        *
      </span>
      <span className="sr-only">with an asterisk</span> are required.
    </p>
  );
}

/** km.css `.field-error.show`: fg text with a red alert icon (never colour alone). */
export function ErrorLine({ id, message }: { readonly id: string; readonly message: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      <KmIcon name="alert" className="size-4 text-red-text" />
      <span>{message}</span>
    </p>
  );
}

const labelClass = "text-sm font-semibold";

interface FieldShellProps {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: React.ReactNode;
  readonly error?: string;
  readonly children: (describedBy: string | undefined, invalid: boolean) => React.ReactNode;
}

/** km.css `.field`: label, control, hint, error line (6px stack). */
export function FieldShell({ id, label, required = false, hint, error = "", children }: FieldShellProps) {
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = error === "" ? undefined : `${id}-err`;
  const describedBy = [hintId, errorId].filter((part) => part !== undefined).join(" ") || undefined;
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {children(describedBy, error !== "")}
      {hint === undefined ? null : (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {errorId === undefined ? null : <ErrorLine id={errorId} message={error} />}
    </div>
  );
}

type TextControlProps = Omit<React.ComponentProps<"input">, "id" | "value" | "onChange"> & {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly face?: "body" | "mono";
};

interface TextFieldProps extends Omit<FieldShellProps, "children"> {
  readonly control: TextControlProps;
  /** km.css `.input-group`: a trailing button beside the control. */
  readonly addon?: React.ReactNode;
}

export function TextField({ control, addon, ...shell }: TextFieldProps) {
  const { value, onValueChange, face = "body", className, ...rest } = control;
  return (
    <FieldShell {...shell}>
      {(describedBy, invalid) => {
        const input = (
          <Input
            id={shell.id}
            name={shell.id}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            aria-required={shell.required === true ? true : undefined}
            autoComplete="off"
            spellCheck={face === "mono" ? false : undefined}
            autoCapitalize={face === "mono" ? "off" : undefined}
            className={cn(face === "mono" && "font-mono text-13", className)}
            {...rest}
          />
        );
        return addon === undefined ? (
          input
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2">
            {input}
            {addon}
          </div>
        );
      }}
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<FieldShellProps, "children"> {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly maxLength?: number;
}

export function TextAreaField({ value, onValueChange, placeholder, maxLength, ...shell }: TextAreaFieldProps) {
  return (
    <FieldShell {...shell}>
      {(describedBy, invalid) => (
        <Textarea
          id={shell.id}
          name={shell.id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
        />
      )}
    </FieldShell>
  );
}

/** Password-type field with a Show/Hide toggle (aria-pressed, name repeats the label). */
export function SecretField({ control, ...shell }: Omit<TextFieldProps, "addon">) {
  const [shown, setShown] = useState(false);
  const toggle = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-pressed={shown}
      aria-label={`${shown ? "Hide" : "Show"} ${shell.label}`}
      onClick={() => setShown((value) => !value)}
    >
      <KmIcon name={shown ? "eye-off" : "eye"} className="size-4" />
      <span>{shown ? "Hide" : "Show"}</span>
    </Button>
  );
  return <TextField {...shell} control={{ ...control, type: shown ? "text" : "password" }} addon={toggle} />;
}

interface SelectFieldProps<T extends string> {
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onValueChange: (value: T) => void;
}

export function SelectField<T extends string>({ id, label, value, options, onValueChange }: SelectFieldProps<T>) {
  return (
    <FieldShell id={id} label={label}>
      {() => (
        <NativeSelect
          id={id}
          name={id}
          value={value}
          onChange={(event) => {
            const next = options.find((option) => option.value === event.target.value);
            if (next !== undefined) onValueChange(next.value);
          }}
        >
          {options.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </FieldShell>
  );
}

const choiceCardClass =
  "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-s3 rounded-base px-s4 py-s3 shadow-(--shadow-card) transition-colors duration-(--dur-fast) has-data-checked:bg-ember-soft [@media(hover:hover)]:hover:not-has-data-checked:bg-card-hov has-[:focus-visible]:bg-focus! has-[:focus-visible]:text-on-focus! has-[:focus-visible]:**:text-inherit!";

/** Inside a focused card the indicator inverts so its state stays visible (agents.html `.option input:focus-visible`). */
const indicatorInFocusClass = "mt-0.5 focus-visible:bg-on-focus! focus-visible:text-focus!";

function OptionCopyText({ copy }: { readonly copy: OptionCopy }) {
  return (
    <span className="grid min-w-0 gap-0.5">
      <span className="text-sm font-semibold">{copy.label}</span>
      {copy.desc === "" ? null : <span className="text-sm text-muted-foreground">{copy.desc}</span>}
    </span>
  );
}

interface ChoiceShellProps {
  readonly legend: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly columns?: 1 | 3;
  readonly children: React.ReactNode;
}

/** agents.html `.fs` fieldset with `.fs-legend`, optional hint and `.options` grid. */
function ChoiceShell({ legend, required = false, hint, columns = 1, children }: ChoiceShellProps) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-s2 p-0">
      <legend className="mb-s1 p-0 text-sm font-semibold">
        {legend}
        {required ? <RequiredMark /> : null}
      </legend>
      {hint === undefined ? null : <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className={cn("grid gap-s2", columns === 3 && "grid-cols-3 max-bp768:grid-cols-[minmax(0,1fr)]")}>
        {children}
      </div>
    </fieldset>
  );
}

/** Choice cards sit on `surface`; inside a card or panel they take the `card` fill. */
export type ChoiceSurface = "page" | "card";

interface ChoiceGroupProps<T extends string> extends Omit<ChoiceShellProps, "children"> {
  readonly name: string;
  readonly value: T;
  readonly options: Readonly<Record<T, OptionCopy>>;
  readonly onValueChange: (value: T) => void;
  readonly surface?: ChoiceSurface;
}

export function ChoiceGroup<T extends string>({
  name,
  value,
  options,
  onValueChange,
  surface = "page",
  ...shell
}: ChoiceGroupProps<T>) {
  const keys = Object.keys(options) as T[];
  return (
    <ChoiceShell {...shell}>
      <RadioGroup
        name={name}
        value={value}
        onValueChange={(next) => {
          const key = keys.find((candidate) => candidate === next);
          if (key !== undefined) onValueChange(key);
        }}
        className="contents"
      >
        {keys.map((key) => (
          <label key={key} className={cn(choiceCardClass, surface === "card" ? "bg-card" : "bg-surface")}>
            <RadioGroupItem value={key} className={indicatorInFocusClass} />
            <OptionCopyText copy={options[key]} />
          </label>
        ))}
      </RadioGroup>
    </ChoiceShell>
  );
}

interface CheckGroupProps<T extends string> extends Omit<ChoiceShellProps, "children"> {
  readonly value: Readonly<Record<T, boolean>>;
  readonly options: Readonly<Record<T, OptionCopy>>;
  readonly onToggle: (key: T, checked: boolean) => void;
  readonly surface?: ChoiceSurface;
}

export function CheckGroup<T extends string>({ value, options, onToggle, surface = "page", ...shell }: CheckGroupProps<T>) {
  const keys = Object.keys(options) as T[];
  return (
    <ChoiceShell {...shell}>
      {keys.map((key) => (
        <label key={key} className={cn(choiceCardClass, surface === "card" ? "bg-card" : "bg-surface")}>
          <Checkbox
            checked={value[key]}
            onCheckedChange={(checked) => onToggle(key, checked)}
            className={indicatorInFocusClass}
          />
          <OptionCopyText copy={options[key]} />
        </label>
      ))}
    </ChoiceShell>
  );
}

interface SwitchRowProps {
  readonly id: string;
  readonly label: string;
  readonly desc?: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}

/** km.css `.switch-row`: copy (label + description) then the switch. */
export function SwitchRow({ id, label, desc, checked, disabled = false, onCheckedChange }: SwitchRowProps) {
  const descId = desc === undefined ? undefined : `${id}-desc`;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s4 py-s3">
      <div className="grid gap-0.5">
        <label id={`${id}-label`} htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        {desc === undefined ? null : (
          <span id={descId} className="block text-sm text-muted-foreground">
            {desc}
          </span>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next)}
        aria-labelledby={`${id}-label`}
        aria-describedby={descId}
      />
    </div>
  );
}
