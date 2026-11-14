// TJ-ARCH-MOB-001 compliant
// km.css `.input` on tokens v1.3.0: `size-control-h` tall, `control` fill, focus fill (no ring).
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
        "min-h-size-control-h file:mr-s2 file:inline-flex file:bg-transparent file:text-sm file:font-semibold file:text-current",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
