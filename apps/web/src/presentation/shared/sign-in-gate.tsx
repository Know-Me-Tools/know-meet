// TJ-ARCH-MOB-001 compliant
// km.js `gate()` / km.css `.gate`: the signed-out state of a signed-in page
// (route-inventory `<page>.gate-signed-out`, km-auth absent). A centred surface
// card (520px, radius-lg, card shadow) with a 56px ember-soft lock tile, an h2,
// the reason, then "Sign in" (primary, returns here after sign-in) and
// "Start a guest meeting".
import { buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";

interface SignInGateProps {
  readonly title: string;
  readonly reason: string;
  /** Where sign-in returns to, e.g. `dashboard#schedule` (km.js `signInUrl(next)`). */
  readonly next: string;
  /** Extra copy below the actions (e.g. agents: "Joining as a guest?"). */
  readonly children?: React.ReactNode;
}

export function SignInGate({ title, reason, next, children }: SignInGateProps) {
  return (
    <section
      aria-labelledby="km-gate-title"
      className="mx-auto my-s6 grid w-[min(100%,520px)] justify-items-center gap-s3 rounded-lg bg-surface px-s5 py-s7 text-center shadow-(--shadow-card)"
    >
      <div className="mb-s2 grid size-14 place-items-center rounded-[16px] bg-ember-soft text-ember-text">
        <KmIcon name="lock" className="size-7" />
      </div>
      <h2 id="km-gate-title" className="text-xl">
        {title}
      </h2>
      <p className="max-w-[42ch] text-muted-foreground">{reason}</p>
      <div className="mt-s3 flex flex-wrap items-center justify-center gap-s2">
        <Link to="/auth" hash={`sign-in?next=${encodeURIComponent(next)}`} className={cn(buttonVariants(), focusFillClass)}>
          <KmIcon name="user" />
          <span>Sign in</span>
        </Link>
        <Link to="/meet" hash="start" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
          <KmIcon name="cam" />
          <span>Start a guest meeting</span>
        </Link>
      </div>
      {children}
    </section>
  );
}
