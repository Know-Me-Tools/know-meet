// TJ-ARCH-MOB-001 compliant
// index.html "Join with a code": a surface card with the mono code input and a
// Join button. The format is checked on blur and submit (never mid-typing); an
// invalid submit announces the error (`role="alert"`) and returns focus to the
// input (F6). A well-formed code opens the invite, or "Code not found" when no
// sample meeting uses it, as the prototype does.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useRef } from "react";
import { describedBy, FormField, hintId } from "../public-shared/form-field";
import {
  CODE_EXAMPLE,
  CODE_MAX_LENGTH,
  codeFormatError,
  normalizeCode,
} from "../public-shared/join-code";
import { findByCode, type SampleMeeting } from "../public-shared/sample-meetings";
import { submitForm, useField } from "../public-shared/use-field";
import { toHash } from "../shared/use-hash-route";

const ID = "join-code";

export function HomeJoinForm({ meetings }: { readonly meetings: readonly SampleMeeting[] }) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const code = useField((value) => codeFormatError(normalizeCode(value), false));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizeCode(code.value);
    const problem = codeFormatError(value, true);
    const ok = submitForm(formRef.current, [
      () => {
        code.setError(problem);
        return problem === "";
      },
    ]);
    if (!ok) return;
    code.setValue(value);
    const view = findByCode(meetings, value) === null ? "wrong-code" : "invite";
    void navigate({ to: "/join", hash: toHash(view, undefined, { code: value }) });
  };

  return (
    <form
      ref={formRef}
      noValidate
      aria-describedby={hintId(ID)}
      onSubmit={onSubmit}
      className="grid max-w-[460px] gap-1.5 rounded-tile bg-surface p-s4 shadow-(--shadow-card)"
    >
      <FormField
        id={ID}
        label="Join with a code"
        error={code.error}
        hint="The code is in your email, SMS or calendar invite."
        announceError
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2">
          <Input
            id={ID}
            name="code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={CODE_EXAMPLE}
            maxLength={CODE_MAX_LENGTH}
            aria-describedby={describedBy(ID, true)}
            className="font-mono tracking-[0.04em]"
            {...code.inputProps}
          />
          <Button type="submit">
            <span>Join</span>
            <KmIcon name="chevron-right" className="size-4" />
          </Button>
        </div>
      </FormField>
    </form>
  );
}
