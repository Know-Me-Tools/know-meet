// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §6 states for the list area: loading skeletons (LH-6,
// no shimmer), the empty region ("No meetings on this device yet"), storage
// unavailable (LH-9: static content with an `alert` glyph and a heading, not
// role="alert") and a read failure (cause, then the fix).
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useId, useRef } from "react";

const SKELETON_ROWS = ["a", "b", "c"] as const;

/** Three `muted` rows after the 300 ms delay; the list region carries `aria-busy`. */
export function HistorySkeleton({ visible }: { readonly visible: boolean }) {
  return (
    <section aria-busy="true" aria-label="Loading history" className="grid gap-s2">
      {visible
        ? SKELETON_ROWS.map((key) => (
            <div key={key} aria-hidden="true" className="h-16 rounded-base bg-muted" />
          ))
        : null}
    </section>
  );
}

/**
 * The empty state. `focusHeading` moves focus to its heading once it shows, after
 * "Delete all history" (shape §6).
 */
export function EmptyHistory({ focusHeading }: { readonly focusHeading: boolean }) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusHeading) heading.current?.focus({ preventScroll: true });
  }, [focusHeading]);
  return (
    <Empty role="region" aria-labelledby={headingId}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KmIcon name="clock" />
        </EmptyMedia>
        <EmptyTitle
          render={(props) => (
            <h2
              {...props}
              id={headingId}
              ref={heading}
              tabIndex={-1}
              className={cn(props.className, "outline-none")}
            />
          )}
        >
          No meetings on this device yet
        </EmptyTitle>
        <EmptyDescription>
          Meetings you join in this browser appear here with the chat you received. Nothing is
          uploaded.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/" className={cn(buttonVariants(), focusFillClass)}>
          <KmIcon name="cam" />
          <span>Start a meeting</span>
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/** `red-soft` note with the `alert` glyph in `red-text`; no controls sit on its fill. */
function ErrorNote({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 items-start gap-s3 rounded-base bg-red-soft px-s4 py-s4 text-foreground"
    >
      <KmIcon name="alert" className="mt-px shrink-0 text-red-text" />
      <div className="grid min-w-0 gap-s2">
        <h2 id={headingId} className="m-0 text-base leading-heading font-semibold">
          {title}
        </h2>
        <p className="m-0 text-sm text-pretty">{children}</p>
      </div>
    </section>
  );
}

/** IndexedDB blocked (some private windows): no list and no delete controls. */
export function StorageBlockedNote() {
  return (
    <ErrorNote title="History isn't available in this window">
      This browser blocked local storage, which happens in some private windows. Meetings still
      work, but nothing is saved here.
    </ErrorNote>
  );
}

/** Reading history failed for another reason; reading again may succeed. */
export function HistoryReadError({
  title,
  onRetry,
}: {
  readonly title: string;
  readonly onRetry: () => void;
}) {
  return (
    <div className="grid gap-s3">
      <ErrorNote title={title}>
        This browser couldn't read its saved history. Close other Know Meet tabs, then try again.
      </ErrorNote>
      <div>
        <Button variant="secondary" onClick={onRetry}>
          <KmIcon name="refresh" />
          <span>Try again</span>
        </Button>
      </div>
    </div>
  );
}
