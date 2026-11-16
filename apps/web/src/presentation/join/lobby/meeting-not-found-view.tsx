// TJ-ARCH-MOB-001 compliant
// prototype join.html `#wrong-code` (acceptance L7): the centre card with the search badge,
// "We couldn’t find that meeting", the code tried, a "Meeting code" form prefilled with it
// (focused, value selected) and "Start a meeting instead". With no code tried (a bare
// /join), the same card asks for a code. The status container carries the state test id.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { BusyLabel } from "../../guest-meeting/busy-label";
import { ErrorCard } from "../../guest-meeting/error-card";
import { CODE_EXAMPLE, startErrorCopy } from "../../guest-meeting/meeting-copy";
import { lobbyHash } from "../../guest-meeting/meeting-routes";
import { useStartMeeting } from "../../guest-meeting/use-start-meeting";
import { codeProblem } from "../../home/code-problem";
import { describedBy, FormField } from "../../public-shared/form-field";
import { CODE_MAX_LENGTH, normalizeCode } from "../../public-shared/join-code";
import { h1Class } from "../../public-shared/ui-classes";
import { submitForm, useField } from "../../public-shared/use-field";
import { CenterCard, StateBadge } from "../center-card";

const CODE_ID = "code-retry";

function CodeRetryForm({ tried }: { readonly tried: string }) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const code = useField((value) => codeProblem(normalizeCode(value), false), tried);

  useEffect(() => {
    if (tried === "") return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [tried]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = normalizeCode(code.value);
    const problem = codeProblem(value, true);
    const valid = submitForm(formRef.current, [
      () => {
        code.setValue(value);
        code.setError(problem);
        return problem === "";
      },
    ]);
    if (valid) void navigate({ to: "/join", hash: lobbyHash(value, "joiner") });
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid w-full gap-1.5 text-left">
      <FormField id={CODE_ID} label="Meeting code" required error={code.error} announceError>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2">
          <Input
            ref={inputRef}
            id={CODE_ID}
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={CODE_EXAMPLE}
            maxLength={CODE_MAX_LENGTH}
            required
            aria-required="true"
            aria-describedby={describedBy(CODE_ID, false)}
            className="font-mono tracking-[0.04em]"
            {...code.inputProps}
          />
          <Button type="submit">Find meeting</Button>
        </div>
      </FormField>
    </form>
  );
}

export function MeetingNotFoundView({ tried }: { readonly tried: string }) {
  const { busy, error, start } = useStartMeeting();
  return (
    <CenterCard labelledBy="nf-title">
      <div
        role="status"
        data-testid={tried === "" ? undefined : "km-state-meeting-not-found"}
        className="grid justify-items-center gap-s4"
      >
        {tried === "" ? null : <StateBadge icon="search" tone="error" />}
        <h1 id="nf-title" className={h1Class}>
          {tried === "" ? "Join a meeting" : "We couldn’t find that meeting"}
        </h1>
        <p className="max-w-[46ch] text-muted-foreground">
          {tried === "" ? (
            "Enter the code from the person who started the meeting."
          ) : (
            <>
              No open meeting uses the code{" "}
              <code className="rounded-6 bg-muted px-1.5 py-px font-mono text-code-inline">
                {tried}
              </code>
              . Check each character with the person who shared it: 0 and o, or 1 and l, are
              easy to mix up.
            </>
          )}
        </p>
      </div>
      <CodeRetryForm tried={tried} />
      {error === null ? null : (
        <ErrorCard copy={startErrorCopy(error)} className="w-full text-left" />
      )}
      <Button
        type="button"
        variant="ghost"
        aria-disabled={busy ? true : undefined}
        aria-busy={busy ? true : undefined}
        onClick={start}
      >
        <BusyLabel busy={busy} icon="cam" label="Start a meeting instead" busyLabel="Starting…" />
      </Button>
    </CenterCard>
  );
}
