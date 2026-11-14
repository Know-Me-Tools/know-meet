// TJ-ARCH-MOB-001 compliant
// km.css `.divider` under Flat 2.0 (D-6): a Separator renders as spacing, never a
// line. It keeps its semantics (role=separator) and its 1px box; callers' margins
// provide the gap.
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "#lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-transparent data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
