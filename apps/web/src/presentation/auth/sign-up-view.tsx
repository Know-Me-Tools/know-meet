// TJ-ARCH-MOB-001 compliant
// auth.html `#sign-up`: name, work email, a new password with live rule ticks
// (the ticks are guidance, not errors), and the terms checkbox with its
// disclosure. Validation runs on blur and submit; an invalid submit focuses the
// first invalid control (F6). A valid submit moves to `#check-email`, the next
// static state (no account is created in this phase).
import { Button } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import { FieldError } from "@know-meet/ui/components/field";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Link, useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useRef, useState } from "react";
import { describedBy, errorId, FormField } from "../public-shared/form-field";
import { requiredMarkClass } from "../public-shared/ui-classes";
import { submitForm, useField } from "../public-shared/use-field";
import { AuthFoot, AuthHead, AuthPanel, AuthShell, FootLine, GuestLink } from "./auth-layout";
import { type AuthParams, authHash } from "./auth-params";
import { PasswordInput } from "./password-input";
import {
  emailError,
  fullNameError,
  newPasswordError,
  passwordRules,
  TERMS_ERROR,
} from "./validators";

function PasswordRuleList({ value }: { readonly value: string }) {
  const rules = passwordRules(value);
  const items = [
    { key: "length", ok: rules.length, text: "At least 10 characters" },
    { key: "number", ok: rules.number, text: "Includes a number" },
  ] as const;
  return (
    <ul id="password-hint" className="m-0 grid list-none gap-0.5 p-0 text-sm text-muted-foreground">
      {items.map((item) => (
        <li
          key={item.key}
          data-ok={item.ok}
          className="flex items-center gap-1.5 data-[ok=true]:text-foreground"
        >
          <KmIcon name="check" className={item.ok ? "size-4 text-green-text" : "size-4"} />
          <span>{item.text}</span>
          {item.ok ? <span className="sr-only">(met)</span> : null}
        </li>
      ))}
    </ul>
  );
}

function TermsField({
  checked,
  error,
  onChange,
}: {
  readonly checked: boolean;
  readonly error: string;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor="terms"
        className="flex min-h-size-target cursor-pointer items-start gap-s3 py-s2"
      >
        <Checkbox
          id="terms"
          className="mt-0.5"
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
          required
          aria-required="true"
          aria-invalid={error === "" ? undefined : true}
          aria-describedby={errorId("terms")}
        />
        <span>
          I agree to the KnowMe terms of service and privacy notice
          <span aria-hidden="true" className={requiredMarkClass}>
            *
          </span>
        </span>
      </label>
      <details className="pl-8 text-sm text-muted-foreground">
        <summary className="flex min-h-8 cursor-pointer items-center font-semibold text-ember-text">
          What you’re agreeing to
        </summary>
        <p className="mt-s2">
          KnowMe stores your account details, the meetings you host, and — only when you turn them
          on — recordings, transcripts and summaries in KnowMe-managed or your own storage. You
          decide who receives meeting summaries in Delivery settings, and you can delete your
          recordings at any time.
        </p>
      </details>
      <FieldError id={errorId("terms")} announce={false}>
        {error === "" ? null : error}
      </FieldError>
    </div>
  );
}

export function SignUpView({ params }: { readonly params: AuthParams }) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const name = useField(fullNameError, params.name ?? "");
  const email = useField(emailError, params.email ?? "");
  const password = useField(newPasswordError);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const next = params.next === undefined ? {} : { next: params.next };

  const checkTerms = () => {
    setTermsError(terms ? "" : TERMS_ERROR);
    return terms;
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitForm(formRef.current, [name.check, email.check, password.check, checkTerms])) return;
    void navigate({
      to: "/auth",
      hash: authHash("check-email", {
        email: email.value.trim(),
        name: name.value.trim(),
        ...next,
      }),
    });
  };

  return (
    <AuthShell withAside={false}>
      <AuthPanel>
        <AuthHead
          title="Create your KnowMe account"
          sub="Turn on agents, recording, delivery and calendars for the meetings you host."
        />
        <p className="text-sm text-muted-foreground">
          Fields marked{" "}
          <span aria-hidden="true" className="text-ember-text">
            *
          </span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
        <form
          ref={formRef}
          noValidate
          onSubmit={onSubmit}
          aria-labelledby="auth-title"
          className="grid gap-s4"
        >
          <FormField id="name" label="Full name" required error={name.error}>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              aria-required="true"
              aria-describedby={describedBy("name", false)}
              {...name.inputProps}
            />
          </FormField>
          <FormField id="email" label="Work email" required error={email.error}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              aria-required="true"
              placeholder="you@company.com"
              aria-describedby={describedBy("email", false)}
              {...email.inputProps}
            />
          </FormField>
          <FormField id="password" label="Password" required error={password.error}>
            <div className="grid gap-s2">
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-describedby={`password-hint ${errorId("password")}`}
                {...password.inputProps}
              />
              <PasswordRuleList value={password.value} />
            </div>
          </FormField>
          <TermsField
            checked={terms}
            error={termsError}
            onChange={(value) => {
              setTerms(value);
              if (termsError !== "" && value) setTermsError("");
            }}
          />
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
        <AuthFoot>
          <FootLine>
            Already have an account?{" "}
            <Link to="/auth" hash={authHash("sign-in", next)}>
              Sign in
            </Link>
          </FootLine>
          <FootLine>
            Not ready? <GuestLink />
          </FootLine>
        </AuthFoot>
      </AuthPanel>
    </AuthShell>
  );
}
