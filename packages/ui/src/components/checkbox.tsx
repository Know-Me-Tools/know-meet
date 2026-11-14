// TJ-ARCH-MOB-001 compliant
// DESIGN.md checkbox (tokens v1.3.0, D-6): `size-check` box, radius-4. Rest
// `control` with no glyph, hover `control-hov`, checked `selected` with an
// `on-selected` tick, focus `focus` (tick `on-focus` when checked). No ring.
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { focusFillClass } from "#lib/focus";
import { cn } from "#lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-size-check shrink-0 items-center justify-center rounded-4 bg-control text-on-control transition-colors duration-(--dur-fast) ease-standard after:absolute after:-inset-3 hover:not-data-disabled:bg-control-hov data-checked:bg-selected data-checked:text-on-selected data-disabled:cursor-not-allowed data-disabled:opacity-50",
        focusFillClass,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-4 [&>svg]:stroke-[2.5]"
      >
        <CheckIcon aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
