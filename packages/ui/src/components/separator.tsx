// TJ-ARCH-MOB-001 compliant
// km.css `.divider`: a 1px muted fill (regions otherwise separate by fill, Flat 2.0).
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "#lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-muted data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
