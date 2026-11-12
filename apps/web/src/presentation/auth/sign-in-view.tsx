// TJ-ARCH-MOB-001 compliant
// auth.html `#sign-in` and `#sign-in-error`. SSO first, then email + password,
// then the magic-link alternative. Validation runs on blur and submit only; an
// invalid submit focuses the first invalid field (F6). In the error state the
// summary takes focus on arrival (it is `role="alert"`, tabIndex -1) and the
// password field asks for re-entry. Sign-in itself is not wired in this phase
// (contract exclusion), so a valid submit or SSO choice says so in a status line.
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { describedBy, FormField } from "../public-shared/form-field";
import { buttonLinkClass } from "../public-shared/ui-classes";
import { submitForm, useField } from "../public-shared/use-field";
import type { SessionUserView } from "../shared/session";
import { type AuthParams, authHash } from "./auth-params";
import { AuthFoot, AuthHead, AuthPanel, AuthShell, FootLine, GuestLink, SignedInNotice } from "./auth-layout";
import { PasswordInput } from "./password-input";
import { emailError, magicLinkEmailError, signInPasswordError } from "./validators";
import { WhyAside } from "./why-aside";

const NOT_WIRED = "Signing in isn’t connected in this preview yet. Continue as a guest to try a meeting.";

interface SignInViewProps {
  readonly params: AuthParams;
  readonly isError: boolean;
  readonly user: SessionUserView | null;
  readonly onSignOut: () => void;
}

function ErrorSummary({ onMagicLink, signUpHash }: { readonly onMagicLink: () => void; readonly signUpHash: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // After the page-heading focus that follows a hash change (km.js `later(…, 0)`).
    const timer = window.setTimeout(() => ref.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby="err-title"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-s3 gap-y-s2 rounded-base bg-red-soft p-s4 outline-none"
    >
      <KmIcon name="alert" className="mt-0.5 text-red-text" />
      <div>
        <h2 id="err-title" className="text-base">
          That email and password don’t match
        </h2>
        <p className="mt-1 text-sm">
          Check the email for typos and re-enter your password — it’s case-sensitive. If you can’t remember it, we can
          email you a one-time sign-in link instead, then you can set a new password in Settings.
        </p>
      </div>
      <div className="col-start-2 mt-s2 flex flex-wrap items-center gap-s2">
        <Button variant="secondary" size="sm" type="button" onClick={onMagicLink}>
          <KmIcon name="mail" className="size-4" />
          <span>Email me a sign-in link</span>
        </Button>
        <Link to="/auth" hash={signUpHash} className={buttonLinkClass("ghost", "sm")}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

export function SignInView({ params, isError, user, onSignOut }: SignInViewProps) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const email = useField(emailError, params.email ?? "");
  const password = useField(signInPasswordError, "", isError ? "Re-enter your password for this email." : "");
  const [status, setStatus] = useState("");
  const next = params.next === undefined ? {} : { next: params.next };

  const goMagicLink = () => {
    const value = email.value.trim();
    const problem = magicLinkEmailError(value);
    if (problem !== "") {
      submitForm(formRef.current, [
        () => {
          email.setError(problem);
          return false;
        },
      ]);
      return;
    }
    void navigate({ to: "/auth", hash: authHash("magic-link-sent", { email: value, ...next }) });
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitForm(formRef.current, [email.check, password.check])) setStatus(NOT_WIRED);
  };

  const sso = (provider: string) => () => setStatus(`${provider} sign-in isn’t connected in this preview yet.`);

  return (
    <AuthShell withAside>
      <AuthPanel>
        <AuthHead title="Sign in to Know Meet" sub="Pick up your meetings, agents and recordings." />
        {user === null ? null : <SignedInNotice user={user} onSignOut={onSignOut} />}
        {isError ? (
          <ErrorSummary onMagicLink={goMagicLink} signUpHash={authHash("sign-up", { ...params })} />
        ) : null}
        <div className="grid gap-s2">
          <Button variant="secondary" type="button" className="w-full" onClick={sso("Google")}>
            Continue with Google
          </Button>
          <Button variant="secondary" type="button" className="w-full" onClick={sso("Microsoft")}>
            Continue with Microsoft
          </Button>
        </div>
        {/* auth.html `.or`; Flat 2.0 (D-6, DESIGN.md over the prototype): no rule lines, spacing separates. */}
        <p aria-hidden="true" className="text-center text-sm text-muted-foreground">
          or with email
        </p>
        <form ref={formRef} noValidate aria-labelledby="form-title" onSubmit={onSubmit} className="grid gap-s4">
          <h2 id="form-title" className="sr-only">
            Sign in with email
          </h2>
          <FormField id="email" label="Email" required error={email.error}>
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
          <FormField
            id="password"
            label="Password"
            required
            error={password.error}
            labelExtra={
              <button
                type="button"
                onClick={goMagicLink}
                className={cn(
                  "min-h-8 rounded-4 py-1 text-sm font-semibold text-ember-text underline underline-offset-[3px]",
                  focusFillClass,
                )}
              >
                Forgot password?
              </button>
            }
          >
            <PasswordInput
              id="password"
              autoComplete="current-password"
              aria-describedby={describedBy("password", false)}
              {...password.inputProps}
            />
          </FormField>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
          <Button variant="secondary" type="button" className="w-full" onClick={goMagicLink}>
            <KmIcon name="mail" />
            <span>Email me a sign-in link</span>
          </Button>
          <p role="status" className={status === "" ? "sr-only" : "text-sm text-muted-foreground"}>
            {status}
          </p>
        </form>
        <AuthFoot>
          <FootLine>
            New to KnowMe?{" "}
            <Link to="/auth" hash={authHash("sign-up", next)}>
              Create an account
            </Link>
          </FootLine>
          <FootLine>
            Just need a quick call? <GuestLink />
          </FootLine>
        </AuthFoot>
      </AuthPanel>
      <WhyAside />
    </AuthShell>
  );
}
