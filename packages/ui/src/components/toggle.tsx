// TJ-ARCH-MOB-001 compliant
// DESIGN.md (tokens v1.3.0, D-6):
//   variant default → segment of a segmented control (`ToggleGroup`) or a toggle
//                     chip: `on-control` text on the `control` track, hover
//                     `control-hov`, pressed `selected` + `on-selected` and a
//                     leading check icon (state is never colour alone).
//   variant outline → pressed ghost/icon button: transparent `fg`, hover
//                     `card-hov`, pressed `selected`.
// Focus is the `focus` fill on both (lib/focus.ts). No shadow, ring or border.
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon } from "lucide-react";
import { focusFillClass } from "#lib/focus";
import { cn } from "#lib/utils";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1.5 rounded-9 text-sm font-semibold whitespace-nowrap transition-[background-color,color] duration-(--dur-fast) ease-standard disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-on-control hover:not-disabled:bg-control-hov aria-pressed:bg-selected aria-pressed:text-on-selected",
        outline:
          "bg-transparent text-foreground hover:not-disabled:bg-accent aria-pressed:bg-selected aria-pressed:text-on-selected",
      },
      size: {
        default: "min-h-size-control-h-sm min-w-9 px-s3",
        sm: "min-h-8 min-w-8 rounded-8 px-s2 text-xs",
        lg: "min-h-size-target min-w-11 rounded-base px-s3 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** Leading check shown only while pressed (segments and toggle chips). */
function TogglePressedCheck() {
  return (
    <CheckIcon
      aria-hidden="true"
      data-slot="toggle-check"
      className="hidden group-aria-pressed/toggle:inline-block"
    />
  );
}

function Toggle({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        toggleVariants({ variant, size }),
        // A standalone toggle chip rests on `control`; inside a ToggleGroup the track is the fill.
        variant === "default" && "bg-control",
        focusFillClass,
        className,
      )}
      {...props}
    >
      {variant === "default" ? <TogglePressedCheck /> : null}
      {children}
    </TogglePrimitive>
  );
}

export { Toggle, TogglePressedCheck, toggleVariants };
