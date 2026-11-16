// TJ-ARCH-MOB-001 compliant
// prototype meet.html `#join-form` (acceptance L1, L6, L6e): "Your name" (required, the only
// thing the flow needs), the join error card above the buttons, "Join meeting" and
// "Cancel". Invalid submit focuses the name; L6e moves focus to the error heading. While
// joining the name is read-only and Join meeting keeps focus (aria-disabled + aria-busy).
import { MAX_DISPLAY_NAME_LENGTH } from "@know-meet/domain";
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { BusyLabel } from "../../guest-meeting/busy-label";
import { ErrorCard } from "../../guest-meeting/error-card";
import { joinErrorCopy, LOBBY_COPY } from "../../guest-meeting/meeting-copy";
import { describedBy, FormField } from "../../public-shared/form-field";
import { buttonLinkClass } from "../../public-shared/ui-classes";
import { type FieldState, submitForm } from "../../public-shared/use-field";
import type { JoinOutcome } from "./use-join-meeting";

const NAME_ID = "lobby-name";

interface LobbyJoinFormProps {
  readonly name: FieldState;
  readonly outcome: JoinOutcome;
  readonly onJoin: (displayName: string) => void;
}

export function LobbyJoinForm({ name, outcome, onJoin }: LobbyJoinFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const joining = outcome.kind === "joining";
  const failed = outcome.kind === "failed" ? outcome.error : null;
  const { setError } = name;

  useEffect(() => {
    if (failed !== null) errorHeadingRef.current?.focus();
  }, [failed]);

  useEffect(() => {
    if (outcome.kind !== "invalid-name") return;
    setError(LOBBY_COPY.nameEmpty);
    document.getElementById(NAME_ID)?.focus();
  }, [outcome.kind, setError]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (joining) return;
    const valid = submitForm(formRef.current, [name.check]);
    if (valid) onJoin(name.value.trim());
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-s5">
      <FormField
        id={NAME_ID}
        label="Your name"
        required
        error={name.error}
        hint={LOBBY_COPY.nameHint}
      >
        <Input
          id={NAME_ID}
          name="name"
          type="text"
          autoComplete="name"
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          required
          aria-required="true"
          readOnly={joining}
          data-testid="km-lobby-display-name"
          aria-describedby={describedBy(NAME_ID, true)}
          {...name.inputProps}
        />
      </FormField>
      {failed === null ? null : (
        <ErrorCard copy={joinErrorCopy(failed)} headingRef={errorHeadingRef} />
      )}
      <div className="grid gap-s2">
        <Button
          type="submit"
          data-testid="km-lobby-join"
          aria-disabled={joining ? true : undefined}
          aria-busy={joining ? true : undefined}
          className="min-h-13 w-full text-base"
        >
          <BusyLabel busy={joining} label="Join meeting" busyLabel="Joining…" />
        </Button>
        <Link to="/" className={buttonLinkClass("ghost", "default", "w-full")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
