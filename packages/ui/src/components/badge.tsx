// TJ-ARCH-MOB-001 compliant
// km.css `.chip` family (28px pill, 12px semibold). Status chips keep fg text and
// carry their colour in the soft fill plus a BadgePip, never colour alone.
//   default / secondary / outline → .chip (muted)
//   ember, cyan                   → .chip-ember, .chip-cyan (coloured text)
//   green, amber                  → .chip-green, .chip-amber
//   red / destructive             → .chip-red
//   locked                        → .lock-badge (24px, sub text)
//   ghost, link                   → shadcn compatibility
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex min-h-7 w-fit shrink-0 items-center gap-1.5 rounded-pill border-0 px-2.5 text-xs leading-heading font-semibold whitespace-nowrap text-foreground no-underline [button&]:cursor-pointer [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-muted",
        secondary: "bg-muted",
        outline: "bg-muted",
        ember: "bg-ember-soft text-ember-text",
        cyan: "bg-cyan-soft text-cyan-text",
        green: "bg-green-soft",
        amber: "bg-amber-soft",
        red: "bg-red-soft",
        destructive: "bg-red-soft",
        locked: "min-h-6 px-s2 text-11 text-muted-foreground bg-muted [&>svg]:size-[13px]",
        ghost: "bg-transparent [a&]:hover:bg-accent [button&]:hover:bg-accent",
        link: "bg-transparent px-0 text-ember-text underline-offset-[3px] hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

/** km.css `.chip .pip`: 8px status dot, coloured by the parent chip's variant. */
function BadgePip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge-pip"
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-round bg-current group-data-[variant=amber]/badge:bg-amber group-data-[variant=destructive]/badge:bg-red group-data-[variant=green]/badge:bg-green group-data-[variant=red]/badge:bg-red",
        className,
      )}
      {...props}
    />
  );
}

export { Badge, BadgePip, badgeVariants };
