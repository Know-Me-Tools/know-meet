/**
 * A2UI interactive components. Button stays enabled while its checks fail: activating it shows
 * the validation messages and sends nothing (the basic catalog disables it, which hides feedback).
 */
import { useId, useState } from "react";
import type { A2uiProps } from "./layout.tsx";
import { childRef, fn, strings, text, type LooseProps } from "./props.ts";

function invalid(props: LooseProps): boolean {
  return props["isValid"] === false;
}

function Errors({ messages, id }: { readonly messages: readonly string[]; readonly id: string }) {
  if (messages.length === 0) return null;
  return (
    <div id={id} className="flex flex-col gap-s1 text-xs text-red-text">
      {messages.map((m) => <span key={m}>{m}</span>)}
    </div>
  );
}

const VARIANT_CLASS: Readonly<Record<string, string>> = {
  primary: "bg-ember-btn text-on-ember hover:bg-ember-btn-hov",
  borderless: "bg-transparent text-ember-text hover:bg-card-hov",
};

export function Button(p: A2uiProps) {
  const [tried, setTried] = useState(false);
  const errorsId = useId();
  const ref = childRef(p.props["child"]);
  const action = fn<() => Promise<void>>(p.props, "action");
  const isInvalid = invalid(p.props);
  const onClick = () => {
    if (isInvalid) {
      setTried(true);
      return;
    }
    setTried(false);
    void action?.();
  };
  const tone = VARIANT_CLASS[text(p.props, "variant")] ?? "bg-card text-fg hover:bg-card-hov";
  return (
    <div data-a2ui-id={p.context.componentModel.id} className="inline-flex flex-col gap-s1">
      <button
        type="button"
        onClick={onClick}
        aria-invalid={tried && isInvalid ? true : undefined}
        aria-describedby={tried && isInvalid ? errorsId : undefined}
        className={`rounded-8 px-s4 py-s2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring ${tone}`}
      >
        {ref === null ? null : p.buildChild(ref.id, ref.basePath)}
      </button>
      {tried && isInvalid ? <Errors id={errorsId} messages={strings(p.props, "validationErrors")} /> : null}
    </div>
  );
}

export function TextField(p: A2uiProps) {
  const [dirty, setDirty] = useState(false);
  const id = useId();
  const setValue = fn<(v: string) => void>(p.props, "setValue");
  const showErrors = dirty && invalid(p.props);
  const long = text(p.props, "variant") === "longText";
  const common = {
    id,
    value: text(p.props, "value"),
    "aria-invalid": showErrors ? true : undefined,
    "aria-describedby": showErrors ? `${id}-errors` : undefined,
    className: "rounded-8 bg-bg-2 px-s3 py-s2 text-sm text-fg ring-1 ring-ring-input focus-visible:outline-2 focus-visible:outline-ring",
  };
  const onChange = (value: string) => {
    setDirty(true);
    setValue?.(value);
  };
  return (
    <div data-a2ui-id={p.context.componentModel.id} className="flex flex-col gap-s1">
      <label htmlFor={id} className="text-xs font-medium text-fg-sub">{text(p.props, "label")}</label>
      {long
        ? <textarea {...common} onChange={(e) => onChange(e.target.value)} />
        : <input {...common} type={text(p.props, "variant") === "obscured" ? "password" : "text"} onChange={(e) => onChange(e.target.value)} />}
      {showErrors ? <Errors id={`${id}-errors`} messages={strings(p.props, "validationErrors")} /> : null}
    </div>
  );
}

export function CheckBox(p: A2uiProps) {
  const setValue = fn<(v: boolean) => void>(p.props, "setValue");
  return (
    <label data-a2ui-id={p.context.componentModel.id} className="inline-flex items-center gap-s2 text-sm text-fg">
      <input type="checkbox" checked={p.props["value"] === true} onChange={(e) => setValue?.(e.target.checked)} className="size-4 accent-ember" />
      {text(p.props, "label")}
    </label>
  );
}

interface Option {
  readonly label: string;
  readonly value: string;
}

function optionsOf(props: LooseProps): readonly Option[] {
  const v = props["options"];
  if (!Array.isArray(v)) return [];
  return v.flatMap((o) => (typeof o === "object" && o !== null ? [{ label: text(o as LooseProps, "label"), value: text(o as LooseProps, "value") }] : []));
}

export function ChoicePicker(p: A2uiProps) {
  const name = useId();
  const raw = p.props["value"];
  const selected = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  const multi = text(p.props, "variant") === "multipleSelection";
  const setValue = fn<(v: readonly string[]) => void>(p.props, "setValue");
  const toggle = (value: string) => {
    if (!multi) return setValue?.([value]);
    return setValue?.(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  };
  return (
    <fieldset data-a2ui-id={p.context.componentModel.id} className="flex flex-col gap-s1">
      <legend className="text-xs font-medium text-fg-sub">{text(p.props, "label")}</legend>
      <div className="flex gap-s3">
        {optionsOf(p.props).map((o) => (
          <label key={o.value} className="inline-flex items-center gap-s1 text-sm text-fg">
            <input type={multi ? "checkbox" : "radio"} name={name} checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="accent-ember" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
