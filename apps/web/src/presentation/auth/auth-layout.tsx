// TJ-ARCH-MOB-001 compliant
// auth.html layout parts: `.auth-shell` (one 480px column, or 480 + 400 with the
// "Why sign in" aside, collapsing below 900px), `.auth-panel`, `.auth-head` (mark
// tile, optional eyebrow, h1, sub), `.hint-box`, `.auth-foot` and the
// signed-in `.notice`.
import { Avatar, AvatarFallback } from "@know-meet/ui/components/avatar";
import { BrandMark } from "@know-meet/ui/components/brand-mark";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { buttonLinkClass, h1Class } from "../public-shared/ui-classes";
import type { SessionUserView } from "../shared/session";

export function AuthShell({
  withAside,
  children,
}: {
  readonly withAside: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-[1040px] grid-cols-[minmax(0,480px)] items-start justify-center gap-s6 px-s5 pt-s6 pb-s8 max-bp600:px-s4 max-bp600:pt-s4 max-bp600:pb-s7",
        withAside &&
          "grid-cols-[minmax(0,480px)_minmax(0,400px)] max-bp900:grid-cols-[minmax(0,480px)]",
      )}
    >
      {children}
    </div>
  );
}

export function AuthPanel({ children }: { readonly children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="auth-title"
      className="grid min-w-0 gap-s5 rounded-lg bg-surface p-s6 shadow-(--shadow-card) max-bp600:px-s4 max-bp600:py-s5"
    >
      {children}
    </section>
  );
}

type HeadTone = "brand" | "mail" | "ok";

const MARK_TONE: Readonly<Record<HeadTone, string>> = {
  brand: "bg-card",
  mail: "bg-ember-soft text-ember-text",
  ok: "bg-green-soft text-green-text",
};

interface AuthHeadProps {
  readonly title: string;
  readonly sub: React.ReactNode;
  readonly tone?: HeadTone;
  readonly icon?: KmIconName;
}

export function AuthHead({ title, sub, tone = "brand", icon }: AuthHeadProps) {
  return (
    <div className="grid gap-s2">
      <div
        aria-hidden="true"
        className={cn("mb-s2 grid size-13 place-items-center rounded-14", MARK_TONE[tone])}
      >
        {icon === undefined ? (
          <BrandMark className="size-[30px]" />
        ) : (
          <KmIcon name={icon} className="size-7" />
        )}
      </div>
      <h1 id="auth-title" className={h1Class}>
        {title}
      </h1>
      <p className="text-muted-foreground">{sub}</p>
    </div>
  );
}

/** km.css `.addr`: an email address inside running copy. */
export function Address({ children }: { readonly children: string }) {
  return <span className="font-semibold text-foreground [overflow-wrap:anywhere]">{children}</span>;
}

export function HintBox({
  icon,
  children,
}: {
  readonly icon: KmIconName;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-s3 rounded-base bg-card p-s4 text-sm text-muted-foreground">
      <KmIcon name={icon} className="text-foreground" />
      <span>{children}</span>
    </div>
  );
}

export function AuthFoot({ children }: { readonly children: React.ReactNode }) {
  return <div className="grid gap-s2 pt-s4 text-sm text-muted-foreground">{children}</div>;
}

/** One `.auth-foot p` line: a question, then its link. */
export function FootLine({ children }: { readonly children: React.ReactNode }) {
  return <p className="flex flex-wrap items-center gap-1">{children}</p>;
}

/** "Continue as guest": the guest meeting start (c11 room route). */
export function GuestLink() {
  return (
    <Link to="/meet" hash="start">
      Continue as guest
    </Link>
  );
}

interface SignedInNoticeProps {
  readonly user: SessionUserView;
  readonly onSignOut: () => void;
}

/** Shown on sign-in when km-auth is already set. */
export function SignedInNotice({ user, onSignOut }: SignedInNoticeProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-s3 gap-y-s2 rounded-base bg-card px-s4 py-s3 text-sm"
    >
      <Avatar size="sm" tone="ember" aria-hidden="true">
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-[1_1_200px]">
        You’re already signed in as <strong>{user.email}</strong>.
      </span>
      <Link to="/dashboard" className={buttonLinkClass("secondary", "sm")}>
        Go to meetings
      </Link>
      <Button variant="ghost" size="sm" type="button" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
