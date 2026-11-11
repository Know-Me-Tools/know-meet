// TJ-ARCH-MOB-001 compliant
// km.css `.empty`: a surface block, start-aligned by default, `align="center"`
// for `.empty-center`; 48px muted icon tile, h3 title, 46ch sub-text copy.
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#lib/utils";

const emptyVariants = cva(
  "group/empty grid w-full min-w-0 gap-s3 rounded-tile bg-surface px-s5 py-s6",
  {
    variants: {
      align: {
        start: "justify-items-start text-left",
        center: "justify-items-center text-center",
      },
    },
    defaultVariants: {
      align: "start",
    },
  },
);

function Empty({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>) {
  return (
    <div
      data-slot="empty"
      data-align={align}
      className={cn(emptyVariants({ align }), className)}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("grid justify-items-[inherit] gap-s2", className)}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "grid size-12 place-items-center rounded-14 bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant }), className)}
      {...props}
    />
  );
}

/** An h3 by default (km.css `.empty h3`); pass `render={<h2 />}` to fit the outline. */
function EmptyTitle({ className, render, ...props }: useRender.ComponentProps<"h3">) {
  return useRender({
    defaultTagName: "h3",
    props: mergeProps<"h3">(
      {
        className: cn(
          "font-display text-lg leading-heading font-semibold tracking-heading text-foreground",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "empty-title" },
  });
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "m-0 max-w-[46ch] text-sm text-muted-foreground text-pretty [&>a]:text-ember-text [&>a]:underline [&>a]:underline-offset-[3px]",
        className,
      )}
      {...props}
    />
  );
}

/** Actions row under the copy (km.css `.btn-row`). */
function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-s2 group-data-[align=center]/empty:justify-center",
        className,
      )}
      {...props}
    />
  );
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
