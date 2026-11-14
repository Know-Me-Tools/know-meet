// TJ-ARCH-MOB-001 compliant
// The "Gathering" mark (km.js `KM_MARK`): ember core, five participants in the
// current colour, one cyan agent at the table. Same drawing as the frame's
// `KmMark` (apps/web/src/app/frame/km-icons.tsx), exposed from the kit so screens
// (auth head, footers) don't import the app shell. Decorative: the link or
// heading beside it carries the name.
import type * as React from "react";
import { cn } from "#lib/utils";

function BrandMark({ className, ...props }: Omit<React.ComponentProps<"svg">, "children">) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      data-slot="brand-mark"
      className={cn("size-7 flex-none text-foreground", className)}
      {...props}
    >
      <circle cx="32" cy="32" r="11" className="fill-ember" />
      <circle cx="32" cy="11" r="6" fill="currentColor" />
      <circle cx="51.97" cy="25.51" r="6" className="fill-cyan" />
      <circle cx="44.34" cy="48.99" r="6" fill="currentColor" />
      <circle cx="19.66" cy="48.99" r="6" fill="currentColor" />
      <circle cx="12.03" cy="25.51" r="6" fill="currentColor" />
    </svg>
  );
}

export { BrandMark };
