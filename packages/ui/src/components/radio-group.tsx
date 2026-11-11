// TJ-ARCH-MOB-001 compliant
// km.css `.check-row input[type=radio]` (settings delivery, agent registration):
// a 20px circle with the D-5 input ring, ember fill and an on-ember dot when
// checked. Rows of choices sit 8px apart; the label row gives the 44px target.
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "#lib/utils";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-s2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-5 shrink-0 rounded-round bg-card shadow-[inset_0_0_0_1px_var(--input)] transition-colors duration-(--dur-fast) after:absolute after:-inset-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_2px_var(--red)] data-checked:bg-primary data-checked:text-primary-foreground data-checked:shadow-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-5 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-round bg-primary-foreground" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
