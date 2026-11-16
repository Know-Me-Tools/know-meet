// TJ-ARCH-MOB-001 compliant
// web-release-acceptance.md section 2 (H2e, L4, L5, L6e): the live `.error-card`. Fill
// `red-soft` on the surface it sits on, radius `radius`, padding s3 x s4, gap s2; a row with
// the alert icon in `red-text` and the heading (an h2, so the state panel has one) in `fg`,
// then a small paragraph. `role="alert"`. No stripe, no stroke (DESIGN.md replacements).
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import type { ErrorCopy } from "./meeting-copy";

interface ErrorCardProps {
  readonly copy: ErrorCopy;
  readonly headingId?: string;
  /** L6e moves focus to the heading; it is then focusable by script only. */
  readonly headingRef?: React.Ref<HTMLHeadingElement>;
  readonly testId?: string;
  readonly className?: string;
}

export function ErrorCard({ copy, headingId, headingRef, testId, className }: ErrorCardProps) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn("grid gap-s2 rounded-base bg-red-soft px-s4 py-s3 text-foreground", className)}
    >
      <div className="flex items-start gap-s2">
        <KmIcon name="alert" className="mt-0.5 size-5 flex-none text-red-text" />
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="font-body text-base font-semibold outline-none"
        >
          {copy.heading}
        </h2>
      </div>
      <p className="text-sm">{copy.text}</p>
    </div>
  );
}
