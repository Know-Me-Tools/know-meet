// TJ-ARCH-MOB-001 compliant
// DESIGN.md radio (tokens v1.3.0, D-6): `size-check` round disc. Rest `control`,
// hover `control-hov`, checked `selected` with an 8px dot in `on-selected`, focus
// `focus` (dot `on-focus`). Rows of choices sit 8px apart; the label row gives
// the 44px target. No ring.
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { focusFillClass } from "#lib/focus";
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
        "group/radio-group-item peer relative flex aspect-square size-size-check shrink-0 rounded-round bg-control text-on-control transition-colors duration-(--dur-fast) ease-standard after:absolute after:-inset-3 hover:not-data-disabled:bg-control-hov data-checked:bg-selected data-checked:text-on-selected data-disabled:cursor-not-allowed data-disabled:opacity-50",
        focusFillClass,
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-size-check items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-size-pip -translate-x-1/2 -translate-y-1/2 rounded-round bg-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
