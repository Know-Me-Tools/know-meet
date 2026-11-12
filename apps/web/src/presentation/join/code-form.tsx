// TJ-ARCH-MOB-001 compliant
// join.html `codeForm` (wrong-code and expired): "Meeting code" with a mono input
// and "Find meeting" side by side. Format errors show on blur and submit; an
// unknown code is reported on submit with the characters people mix up. The
// error line is announced (`role="alert"`) and focus returns to the input (F6).
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { describedBy, FormField } from "../public-shared/form-field";
import {
  CODE_EXAMPLE,
  CODE_MAX_LENGTH,
  codeFormatError,
  normalizeCode,
  unknownCodeError,
} from "../public-shared/join-code";
import { findByCode, type SampleMeeting } from "../public-shared/sample-meetings";
import { submitForm, useField } from "../public-shared/use-field";
import { toHash } from "../shared/use-hash-route";

interface CodeFormProps {
  readonly idSuffix: string;
  readonly meetings: readonly SampleMeeting[];
  readonly initialCode?: string;
  /** Focus and select the prefilled code on arrival (wrong-code with a tried code). */
  readonly focusOnMount?: boolean;
}

export function CodeForm({
  idSuffix,
  meetings,
  initialCode = "",
  focusOnMount = false,
}: CodeFormProps) {
  const id = `code-${idSuffix}`;
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const code = useField((value) => codeFormatError(normalizeCode(value), false), initialCode);

  useEffect(() => {
    if (!focusOnMount) return undefined;
    // After the page-heading focus that follows a hash change (km.js `later(…, 0)`).
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusOnMount]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizeCode(code.value);
    const problem =
      codeFormatError(value, true) ||
      (findByCode(meetings, value) === null ? unknownCodeError(value) : "");
    const ok = submitForm(formRef.current, [
      () => {
        code.setValue(value);
        code.setError(problem);
        return problem === "";
      },
    ]);
    if (ok) void navigate({ to: "/join", hash: toHash("invite", undefined, { code: value }) });
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid w-full gap-1.5 text-left">
      <FormField
        id={id}
        label="Meeting code"
        required
        error={code.error}
        hint="Find it in your invite email, SMS or calendar event."
        announceError
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2">
          <Input
            ref={inputRef}
            id={id}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={CODE_EXAMPLE}
            maxLength={CODE_MAX_LENGTH}
            required
            aria-required="true"
            aria-describedby={describedBy(id, true)}
            className="font-mono tracking-[0.04em]"
            {...code.inputProps}
          />
          <Button type="submit">Find meeting</Button>
        </div>
      </FormField>
    </form>
  );
}
