// TJ-ARCH-MOB-001 compliant
// km.css surfaces. Flat 2.0: no ring or border; the card separates by fill.
//   variant default → .card (surface, radius-tile)
//   variant raised  → .card-raised (card fill)
//   variant panel   → .panel (surface, radius-lg, wider gap)
// Padding lives on the card (s5, s4 under 768px) as in the prototype.
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#lib/utils";

const cardVariants = cva(
  "group/card grid min-w-0 content-start gap-s3 bg-surface p-s5 text-card-foreground shadow-(--shadow-card) max-bp768:p-s4 [a&]:no-underline [a&]:transition-colors [a&]:duration-(--dur-fast) [a&]:hover:bg-accent outline-none focus-visible:bg-focus! focus-visible:text-on-focus! focus-visible:[&_*]:text-on-focus!",
  {
    variants: {
      variant: {
        default: "rounded-tile",
        raised: "rounded-tile bg-card",
        panel: "gap-s4 rounded-lg",
      },
      size: {
        default: "",
        sm: "gap-0.5 rounded-base p-s4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Card({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/** km.css `.card-head`: title block left, actions right, wraps on narrow cards. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-0.5 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] has-data-[slot=card-action]:gap-x-s3",
        className,
      )}
      {...props}
    />
  );
}

/** An h3 by default (km.css `.card h3`); pass `render={<h2 />}` to fit the outline. */
function CardTitle({ className, render, ...props }: useRender.ComponentProps<"h3">) {
  return useRender({
    defaultTagName: "h3",
    props: mergeProps<"h3">(
      {
        className: cn(
          "font-display text-lg leading-heading font-semibold tracking-heading text-foreground [overflow-wrap:anywhere]",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "card-title" },
  });
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex flex-wrap items-center gap-s2 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("grid gap-s3", className)} {...props} />;
}

/** km.css `.btn-row`: no rule above it; the gap separates it from the content. */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex flex-wrap items-center gap-s2", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};
