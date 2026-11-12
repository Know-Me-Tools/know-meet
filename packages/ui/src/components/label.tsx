// TJ-ARCH-MOB-001 compliant
// km.css `.field label`: 14px semibold.
import type * as React from "react";
import { cn } from "#lib/utils";

function Label({ className, htmlFor, children, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "flex items-center gap-s2 text-sm leading-heading font-semibold text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };
