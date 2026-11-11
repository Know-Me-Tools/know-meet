/**
 * A2UI v1.0 basic-catalog input components. A Button whose `checks` fail
 * stays enabled (so keyboard and pointer users get feedback), sends nothing,
 * and makes the surface's fields show their validation messages.
 */
import { createComponentImplementation, type ReactComponentImplementation } from "@a2ui/react";
import { ButtonApi, CheckBoxApi, ChoicePickerApi, DateTimeInputApi, SliderApi, TextFieldApi } from "@a2ui/web_core/v1_0";
import { useId, useState } from "react";
import { Button } from "../ui/button.tsx";
import { cn } from "../ui/cn.ts";
import { errorsOf, useSurfaceUi } from "./surface-ui.tsx";

function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function FieldErrors({ id, errors }: { readonly id: string; readonly errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul id={id} className="text-xs text-red-text">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

const A2uiButton = createComponentImplementation(ButtonApi, ({ props, context, buildChild }) => {
  const ui = useSurfaceUi();
  const errors = errorsOf(props.isValid, props.validationErrors);
  const errorId = useId();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        data-a2ui-id={context.componentModel.id}
        variant={props.variant === "primary" ? "default" : props.variant === "borderless" ? "ghost" : "secondary"}
        aria-describedby={ui.submitAttempted && errors.length > 0 ? errorId : undefined}
        onClick={() => {
          if (props.isValid === false) {
            ui.markSubmitAttempted();
            return;
          }
          void props.action?.();
        }}
      >
        {typeof props.child === "string" ? buildChild(props.child) : null}
      </Button>
      {ui.submitAttempted ? <FieldErrors id={errorId} errors={errors} /> : null}
    </span>
  );
});

const TextField = createComponentImplementation(TextFieldApi, ({ props, context }) => {
  const ui = useSurfaceUi();
  const [dirty, setDirty] = useState(false);
  const inputId = useId();
  const errorId = useId();
  const errors = dirty || ui.submitAttempted ? errorsOf(props.isValid, props.validationErrors) : [];
  const type = props.variant === "number" ? "number" : props.variant === "obscured" ? "password" : "text";
  const common = {
    id: inputId,
    value: str(props.value),
    "aria-invalid": errors.length > 0,
    ...(errors.length > 0 ? { "aria-describedby": errorId } : {}),
    className: cn("w-full rounded-md bg-bg-2 px-3 py-2 text-sm text-fg ring-1 ring-ring-input focus-visible:outline-2 focus-visible:outline-ember", errors.length > 0 && "ring-red"),
    onChange: (e: { readonly target: { readonly value: string } }) => {
      setDirty(true);
      props.setValue?.(e.target.value);
    },
  };
  return (
    <div data-a2ui-id={context.componentModel.id} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-13 font-medium text-fg">
        {str(props.label)}
      </label>
      {props.variant === "longText" ? <textarea {...common} /> : <input type={type} {...common} />}
      <FieldErrors id={errorId} errors={errors} />
    </div>
  );
});

const CheckBox = createComponentImplementation(CheckBoxApi, ({ props, context }) => {
  const inputId = useId();
  return (
    <div data-a2ui-id={context.componentModel.id} className="flex items-center gap-2">
      <input id={inputId} type="checkbox" className="size-4 accent-ember" checked={props.value === true} onChange={(e) => props.setValue?.(e.target.checked)} />
      <label htmlFor={inputId} className="text-sm text-fg">
        {str(props.label)}
      </label>
    </div>
  );
});

const ChoicePicker = createComponentImplementation(ChoicePickerApi, ({ props, context }) => {
  const name = useId();
  const selected: readonly unknown[] = Array.isArray(props.value) ? props.value : [];
  const single = props.variant === "mutuallyExclusive";
  const options = Array.isArray(props.options) ? props.options : [];
  const toggle = (value: string, checked: boolean): void => {
    const next = single ? [value] : checked ? [...selected.filter((v) => v !== value), value] : selected.filter((v) => v !== value);
    props.setValue?.(next);
  };
  return (
    <fieldset data-a2ui-id={context.componentModel.id} className="flex flex-col gap-1">
      <legend className="text-13 font-medium text-fg">{str(props.label)}</legend>
      {options.map((option) => {
        const value = str(option.value);
        return (
          <label key={value} className="flex items-center gap-2 text-sm text-fg">
            <input type={single ? "radio" : "checkbox"} name={name} className="size-4 accent-ember" checked={selected.includes(value)} onChange={(e) => toggle(value, e.target.checked)} />
            {str(option.label)}
          </label>
        );
      })}
    </fieldset>
  );
});

const Slider = createComponentImplementation(SliderApi, ({ props, context }) => {
  const inputId = useId();
  return (
    <div data-a2ui-id={context.componentModel.id} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-13 text-fg">
        {str(props.label) || "Value"}
      </label>
      <input id={inputId} type="range" min={Number(props.min ?? 0)} max={Number(props.max ?? 100)} value={Number(props.value ?? 0)} onChange={(e) => props.setValue?.(Number(e.target.value))} />
    </div>
  );
});

const DateTimeInput = createComponentImplementation(DateTimeInputApi, ({ props, context }) => {
  const inputId = useId();
  return (
    <div data-a2ui-id={context.componentModel.id} className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-13 text-fg">
        {str(props.label) || "Date and time"}
      </label>
      <input id={inputId} type="datetime-local" className="rounded-md bg-bg-2 px-3 py-2 text-sm text-fg" value={str(props.value)} onChange={(e) => props.setValue?.(e.target.value)} />
    </div>
  );
});

export const INPUT_COMPONENTS: readonly ReactComponentImplementation[] = [A2uiButton, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput];
