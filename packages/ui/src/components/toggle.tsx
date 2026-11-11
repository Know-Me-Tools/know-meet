// TJ-ARCH-MOB-001 compliant
// km.css `.seg button[aria-pressed]` (default) and the pressed `.icon-btn` (outline).
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#lib/utils";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1.5 rounded-9 border-0 text-sm font-semibold whitespace-nowrap transition-[background-color,color] duration-(--dur-fast) ease-standard disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_2px_var(--red)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-muted-foreground hover:not-aria-pressed:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-(--seg-pressed-shadow)",
        outline:
          "bg-transparent text-foreground hover:not-disabled:bg-accent aria-pressed:bg-accent",
      },
      size: {
        default: "min-h-9 min-w-9 px-s3",
        sm: "min-h-8 min-w-8 rounded-8 px-s2 text-xs",
        lg: "min-h-11 min-w-11 rounded-base px-s3 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
