// TJ-ARCH-MOB-001 compliant
// km.css `.check-row input[type=checkbox]`: 20px box, ember fill when checked.
// The unchecked box uses the D-5 input ring so its boundary meets SC 1.4.11.
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "#lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-4 bg-card shadow-[inset_0_0_0_1px_var(--input)] transition-colors duration-(--dur-fast) after:absolute after:-inset-x-3 after:-inset-y-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_2px_var(--red)] data-checked:bg-primary data-checked:text-primary-foreground data-checked:shadow-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-4 [&>svg]:stroke-[2.25]"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
