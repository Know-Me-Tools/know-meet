// TJ-ARCH-MOB-001 compliant
// auth.html `#check-email` (after sign-up) and `#magic-link-sent`: confirmation
// panels with a hint, a resend button on a 30s cooldown and a way to change the
// address. Verification and email sending are not wired in this phase, so the
// resend confirmation and "I've verified" outcome are announced in the status line.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useState } from "react";
import { SIGNED_IN_SAMPLE_USER } from "../public-shared/sample-meetings";
import { buttonLinkClass } from "../public-shared/ui-classes";
import {
  Address,
  AuthFoot,
  AuthHead,
  AuthPanel,
  AuthShell,
  FootLine,
  GuestLink,
  HintBox,
} from "./auth-layout";
import { type AuthParams, authHash } from "./auth-params";
import { useResendCooldown } from "./use-resend-cooldown";
import { addressOr } from "./validators";

function ResendRow({
  label,
  sentMessage,
  change,
}: {
  readonly label: string;
  readonly sentMessage: string;
  readonly change: React.ReactNode;
}) {
  const cooldown = useResendCooldown();
  const [sent, setSent] = useState("");
  return (
    <>
      <div className="flex flex-wrap items-center gap-s2">
        <Button
          variant="secondary"
          type="button"
          disabled={!cooldown.canResend}
          onClick={() => {
            setSent(sentMessage);
            cooldown.restart();
          }}
        >
          <KmIcon name="refresh" />
          <span>{label}</span>
        </Button>
        {change}
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {sent === "" ? cooldown.line : `${sent} ${cooldown.line}`}
      </p>
    </>
  );
}

export function CheckEmailView({ params }: { readonly params: AuthParams }) {
  const address = addressOr(params.email, SIGNED_IN_SAMPLE_USER.email);
  const next = params.next === undefined ? {} : { next: params.next };
  const [verifyNote, setVerifyNote] = useState("");
  return (
    <AuthShell withAside={false}>
      <AuthPanel>
        <AuthHead
          title="Check your email"
          tone="mail"
          icon="mail"
          sub={
            <>
              We sent a verification link to <Address>{address}</Address>. Open it to finish
              creating your account.
            </>
          }
        />
        <HintBox icon="info">
          The email comes from Know Meet. If it isn’t in your inbox within a minute, check spam or
          promotions. The link expires in 24 hours.
        </HintBox>
        <Button
          type="button"
          className="w-full"
          onClick={() =>
            setVerifyNote(
              "Verification isn’t connected in this preview yet, so there’s nothing to check.",
            )
          }
        >
          <KmIcon name="check" />
          <span>I’ve verified my email</span>
        </Button>
        <p
          role="status"
          className={verifyNote === "" ? "sr-only" : "text-sm text-muted-foreground"}
        >
          {verifyNote}
        </p>
        <ResendRow
          label="Resend email"
          sentMessage={`Verification email sent again to ${address}.`}
          change={
            <Link
              to="/auth"
              hash={authHash("sign-up", {
                email: address,
                ...(params.name === undefined ? {} : { name: params.name }),
                ...next,
              })}
              className={buttonLinkClass("ghost")}
            >
              <KmIcon name="edit" />
              <span>Change email</span>
            </Link>
          }
        />
      </AuthPanel>
    </AuthShell>
  );
}

export function MagicLinkView({ params }: { readonly params: AuthParams }) {
  const address = addressOr(params.email, SIGNED_IN_SAMPLE_USER.email);
  const back = authHash("sign-in", {
    email: address,
    ...(params.next === undefined ? {} : { next: params.next }),
  });
  return (
    <AuthShell withAside={false}>
      <AuthPanel>
        <AuthHead
          title="Check your inbox"
          tone="ok"
          icon="send"
          sub={
            <>
              We emailed a one-time sign-in link to <Address>{address}</Address>.
            </>
          }
        />
        <HintBox icon="mail">
          Open the email on this device and select “Sign in to Know Meet”. The link works once and
          expires in 15 minutes; you’ll land back where you started.
        </HintBox>
        <ResendRow
          label="Send a new link"
          sentMessage={`New sign-in link sent to ${address}. The earlier link no longer works.`}
          change={
            <Link to="/auth" hash={back} className={buttonLinkClass("ghost")}>
              <KmIcon name="edit" />
              <span>Use a different email</span>
            </Link>
          }
        />
        <AuthFoot>
          <FootLine>
            Prefer your password?{" "}
            <Link to="/auth" hash={back}>
              Sign in with password
            </Link>
          </FootLine>
          <FootLine>
            Need to talk now? <GuestLink />
          </FootLine>
        </AuthFoot>
      </AuthPanel>
    </AuthShell>
  );
}
