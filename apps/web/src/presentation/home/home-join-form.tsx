// TJ-ARCH-MOB-001 compliant
// index.html "Join with a code" (acceptance H1, H3): a surface card with the mono code
// input and Join. The format is checked on blur and submit, never while typing; an invalid
// submit announces the error (`role="alert"`) and returns focus to the field. A well-formed
// code opens the lobby for it; only the token service can say whether it exists, so an
// unknown code is reported in the lobby (L7), when Join meeting asks for a token.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useRef } from "react";
import { CODE_EXAMPLE, HOME_COPY } from "../guest-meeting/meeting-copy";
import { lobbyHash } from "../guest-meeting/meeting-routes";
import { describedBy, FormField, hintId } from "../public-shared/form-field";
import { CODE_MAX_LENGTH, normalizeCode } from "../public-shared/join-code";
import { submitForm, useField } from "../public-shared/use-field";
import { codeProblem } from "./code-problem";

const ID = "join-code";

export function HomeJoinForm() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const code = useField((value) => codeProblem(normalizeCode(value), false));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizeCode(code.value);
    const problem = codeProblem(value, true);
    const valid = submitForm(formRef.current, [
      () => {
        code.setError(problem);
        return problem === "";
      },
    ]);
    if (!valid) return;
    code.setValue(value);
    void navigate({ to: "/join", hash: lobbyHash(value, "joiner") });
  };

  return (
    <form
      ref={formRef}
      noValidate
      aria-describedby={hintId(ID)}
      onSubmit={onSubmit}
      className="grid max-w-[460px] gap-1.5 rounded-tile bg-surface p-s4"
    >
      <FormField
        id={ID}
        label="Join with a code"
        error={code.error}
        hint={HOME_COPY.codeHint}
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
            data-testid="km-home-join-code"
            aria-describedby={describedBy(ID, true)}
            className="font-mono tracking-[0.04em]"
            {...code.inputProps}
          />
          <Button type="submit" data-testid="km-home-join">
            <span>Join</span>
            <KmIcon name="chevron-right" className="size-4" />
          </Button>
        </div>
      </FormField>
    </form>
  );
}
