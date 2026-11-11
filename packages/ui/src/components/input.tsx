// TJ-ARCH-MOB-001 compliant
// km.css `.input`: 48px, card fill, D-5 1px input ring, 2px ember focus ring.
import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { fieldControlClass } from "#lib/field-control";
import { cn } from "#lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldControlClass,
        "min-h-12 file:mr-s2 file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
