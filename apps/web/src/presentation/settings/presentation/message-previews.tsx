// TJ-ARCH-MOB-001 compliant
// settings.html template previews: `.email-card` (meta rows on bg-2, then the
// body) and `.phone-frame` with an SMS `.bubble`. Flat 2.0 (D-6): the
// prototype's 1px inset hairline on both frames is dropped; the card fill on the
// panel surface carries the boundary. The fake buttons inside the email are
// decorative (`aria-hidden`), as in the prototype.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";

export function EmailPreview({
  label,
  from,
  to,
  subject,
  children,
}: {
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly children: React.ReactNode;
}) {
  return (
    <article
      aria-label={label}
      className="grid overflow-hidden rounded-tile bg-card shadow-(--shadow-card)"
    >
      <dl className="m-0 grid gap-1 bg-bg-2 px-s4 py-s3 text-sm">
        {(
          [
            ["From", from],
            ["To", to],
          ] as const
        ).map(([term, value]) => (
          <div key={term} className="grid grid-cols-[64px_minmax(0,1fr)] gap-s2">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="m-0 [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-s2">
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="m-0 [overflow-wrap:anywhere]">
            <b>{subject === "" ? "(no subject)" : subject}</b>
          </dd>
        </div>
      </dl>
      <div className="grid gap-s3 px-s4 py-s5 text-sm [&_h3]:text-lg [&_h3]:[overflow-wrap:anywhere] [&_h4]:font-mono [&_h4]:text-11 [&_h4]:tracking-[0.1em] [&_h4]:text-muted-foreground [&_h4]:uppercase">
        {children}
      </div>
    </article>
  );
}

/** A decorative button inside an email preview (not interactive). */
export function FakeButton({
  variant,
  children,
}: {
  readonly variant: "default" | "secondary";
  readonly children: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(buttonVariants({ variant, size: "sm" }), "justify-self-start")}
    >
      {children}
    </span>
  );
}

export function SmsPreview({ from, text }: { readonly from: string; readonly text: string }) {
  return (
    <div
      role="img"
      aria-label={`SMS preview: ${text}`}
      className="grid w-[min(100%,340px)] gap-s2 rounded-28 bg-bg-2 p-s4"
    >
      <span className="text-center text-xs text-muted-foreground">Text message · from {from}</span>
      <div className="max-w-[88%] justify-self-start rounded-[18px_18px_18px_6px] bg-muted px-3.5 py-2.5 text-sm leading-[1.45] whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
        {text}
      </div>
    </div>
  );
}
