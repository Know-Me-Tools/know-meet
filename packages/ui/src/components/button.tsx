// TJ-ARCH-MOB-001 compliant
// km.css `.btn` family. shadcn variant names are kept so callers stay compatible:
//   default     → .btn-primary (ember fill)
//   secondary   → .btn (raised card fill)
//   outline     → .btn as well (Flat 2.0 has no outlines)
//   ghost       → .btn-ghost / .icon-btn
//   destructive → .btn-danger
//   link        → inline ember text link
// Focus is the `focus` fill with `on-focus` content on every variant (D-6, lib/focus.ts).
// Ghost/icon pressed (aria-pressed) is `selected`. Sizes keep the 44px target
// (`size-target`); `sm` and `xs` are for pointer: fine layouts only.
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { focusFillClass } from "#lib/focus";
import { cn } from "#lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-s2 rounded-base leading-heading font-semibold whitespace-nowrap no-underline transition-[background-color,transform] duration-(--dur-fast) ease-standard select-none active:not-aria-[haspopup]:not-disabled:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:not-disabled:bg-ember-btn-hov",
        secondary:
          "bg-secondary text-secondary-foreground shadow-(--shadow-card) hover:not-disabled:bg-accent aria-expanded:bg-accent",
        outline:
          "bg-secondary text-secondary-foreground shadow-(--shadow-card) hover:not-disabled:bg-accent aria-expanded:bg-accent",
        ghost:
          "bg-transparent text-foreground hover:not-disabled:bg-accent aria-expanded:bg-accent aria-pressed:bg-selected aria-pressed:text-on-selected",
        destructive:
          "bg-destructive text-destructive-foreground hover:not-disabled:bg-danger-btn-hov",
        link: "min-h-0! bg-transparent px-0! text-ember-text underline-offset-[3px] hover:underline",
      },
      size: {
        default: "min-h-size-target px-s4 text-15 [&_svg:not([class*='size-'])]:size-5",
        xs: "min-h-8 gap-1 rounded-8 px-s2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "min-h-size-control-h-sm rounded-10 px-s3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-size-control-h px-s5 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-size-target p-0 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-8 rounded-8 p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-size-control-h-sm rounded-10 p-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-size-control-h p-0 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), focusFillClass, className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
