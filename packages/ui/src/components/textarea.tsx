// TJ-ARCH-MOB-001 compliant
// km.css `textarea.input`: same control as Input, `size-textarea-min-h` minimum, vertical resize.
import type * as React from "react";
import { fieldControlClass } from "#lib/field-control";
import { cn } from "#lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldControlClass,
        "flex min-h-size-textarea-min-h resize-y leading-body",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
