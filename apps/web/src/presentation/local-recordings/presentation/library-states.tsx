// TJ-ARCH-MOB-001 compliant
// Shape recordings-library.md §6 states for the library area: loading (two skeleton
// cards after 300 ms, no shimmer), empty (with the three steps of how recording works,
// or the "can't record" text when this browser has no recorder), storage unavailable
// (static content with an `alert` glyph and a heading, not role="alert") and a read
// failure (cause, then the fix).
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@know-meet/ui/components/empty";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useState } from "react";

const SKELETON_DELAY_MS = 300;
const SKELETON_CARDS = ["a", "b"] as const;

/** True once `delayMs` passed; skeletons wait so a quick read never flashes them. */
function useDelayedFlag(delayMs: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setOn(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return on;
}

export function LibrarySkeleton() {
  const visible = useDelayedFlag(SKELETON_DELAY_MS);
  return (
    <section
      aria-busy="true"
      aria-label="Loading recordings"
      className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-s4"
    >
      {visible
        ? SKELETON_CARDS.map((key) => (
            <div
              key={key}
              aria-hidden="true"
              className="grid overflow-hidden rounded-tile bg-surface"
            >
              <div className="aspect-video bg-muted" />
              <div className="grid gap-s2 p-s4">
                <div className="h-4 w-2/3 rounded-pill bg-muted" />
                <div className="h-3 w-1/2 rounded-pill bg-muted" />
              </div>
            </div>
          ))
        : null}
    </section>
  );
}

interface Step {
  readonly icon: KmIconName;
  readonly title: string;
  readonly detail?: string;
}

const STEPS: readonly Step[] = [
  { icon: "record", title: "Ask the room" },
  { icon: "users", title: "Everyone agrees" },
  {
    icon: "database",
    title: "Saved in this browser",
    detail: "Never uploaded. Download it to keep a copy elsewhere.",
  },
];

const EMPTY_TEXT =
  "Ask to record from the meeting room. Everyone is asked first, and the file is saved only in this browser.";
const CANNOT_RECORD_TEXT =
  "This browser can't record meetings. Recording works in current Chrome, Edge, Firefox and Safari on a computer.";

export function EmptyLibrary({ canRecord }: { readonly canRecord: boolean }) {
  return (
    <Empty role="region" aria-labelledby="recordings-empty-h">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KmIcon name="film" />
        </EmptyMedia>
        <EmptyTitle render={(props) => <h2 {...props} id="recordings-empty-h" />}>
          No recordings on this device
        </EmptyTitle>
        <EmptyDescription>{canRecord ? EMPTY_TEXT : CANNOT_RECORD_TEXT}</EmptyDescription>
      </EmptyHeader>
      {canRecord ? (
        <ol className="grid gap-s3">
          {STEPS.map((step) => (
            <li key={step.title} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s3">
              <span
                aria-hidden="true"
                className="inline-grid size-9 place-items-center rounded-10 bg-muted text-muted-foreground"
              >
                <KmIcon name={step.icon} className="size-4" />
              </span>
              <span className="grid gap-0.5 pt-1.5">
                <strong className="text-sm font-semibold">{step.title}</strong>
                {step.detail === undefined ? null : (
                  <span className="text-sm text-muted-foreground">{step.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <EmptyContent>
        <Link to="/" className={cn(buttonVariants(), focusFillClass)}>
          <KmIcon name="cam" />
          <span>Start a meeting</span>
        </Link>
      </EmptyContent>
    </Empty>
  );
}

function StaticProblem({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="recordings-problem-h"
      className="grid gap-s3 rounded-base bg-surface px-s5 py-s4"
    >
      <h2 id="recordings-problem-h" className="flex items-center gap-s2 text-base">
        <KmIcon name="alert" className="text-red-text" />
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

export function StorageUnavailable() {
  return (
    <StaticProblem title="Recordings aren't available in this window">
      <p className="text-sm text-muted-foreground">
        This browser blocked local storage, which happens in some private windows.
      </p>
    </StaticProblem>
  );
}

export function ReadFailed({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <StaticProblem title="Couldn't read the recordings">
      <p className="text-sm text-muted-foreground">
        The browser didn't return the recordings saved here. Try again; if it keeps failing, close
        other Know Meet tabs and reload the page.
      </p>
      <div>
        <Button type="button" variant="secondary" onClick={onRetry}>
          <KmIcon name="refresh" />
          <span>Try again</span>
        </Button>
      </div>
    </StaticProblem>
  );
}
