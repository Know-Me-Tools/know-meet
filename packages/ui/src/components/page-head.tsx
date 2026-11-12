// TJ-ARCH-MOB-001 compliant
// km.css `.page-head` (flex, wraps, actions at the end), its text column (grid,
// gap s2, max 72ch), `.eyebrow` (mono 11px uppercase, ember text), `h1`
// (text-2xl bold) and `.sub` (fg-sub). Under 768px: margin s5, items start. Compound parts so each screen composes only
// what it shows. `PageTitle` takes `tabIndex=-1` so a hash change can move focus to
// it (km.js `focusHeading`); programmatic focus shows no fill (globals.css).
import type * as React from "react";
import { cn } from "#lib/utils";

function PageHead({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="page-head"
      className={cn("mb-s6 flex flex-wrap items-end justify-between gap-s4 max-bp768:mb-s5 max-bp768:items-start", className)}
      {...props}
    />
  );
}

function PageHeadText({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="page-head-text" className={cn("grid min-w-0 max-w-[72ch] gap-s2", className)} {...props} />
  );
}

function PageEyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="page-eyebrow"
      className={cn("block font-mono text-11 font-semibold tracking-eyebrow text-ember-text uppercase", className)}
      {...props}
    />
  );
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      tabIndex={-1}
      className={cn("text-2xl font-bold outline-none", className)}
      {...props}
    />
  );
}

function PageSub({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="page-sub" className={cn("text-muted-foreground", className)} {...props} />;
}

function PageActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="page-actions" className={cn("flex flex-wrap items-center gap-s2", className)} {...props} />;
}

export { PageActions, PageEyebrow, PageHead, PageHeadText, PageSub, PageTitle };
