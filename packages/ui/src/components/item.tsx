// TJ-ARCH-MOB-001 compliant
// km.css `.list` / `.list-row`: leading tile, title + meta body, trailing actions.
//   variant default → .list-row (surface fill, card shadow)
//   variant outline → raised card fill (Flat 2.0 has no outlines)
//   variant muted   → muted fill
// Links and buttons rendered as items get the card-hov hover. Under 768px the
// trailing actions wrap below the body, as in the prototype.
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Separator } from "#components/separator";
import { cn } from "#lib/utils";

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn("group/item-group flex w-full flex-col gap-s2", className)}
      {...props}
    />
  );
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="item-separator"
      orientation="horizontal"
      className={cn("my-s2", className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  "group/item flex w-full min-w-0 flex-wrap items-center rounded-base text-inherit no-underline transition-colors duration-(--dur-fast) ease-standard [a&]:hover:bg-accent [button&]:cursor-pointer [button&]:border-0 [button&]:text-left [button&]:hover:bg-accent",
  {
    variants: {
      variant: {
        default: "bg-surface shadow-(--shadow-card)",
        outline: "bg-card shadow-(--shadow-card)",
        muted: "bg-muted",
      },
      size: {
        default: "gap-s3 px-s4 py-s3",
        sm: "gap-s2 px-s3 py-s2",
        xs: "gap-s2 px-2.5 py-s2 in-data-[slot=dropdown-menu-content]:p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Item({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(itemVariants({ variant, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "item",
      variant,
      size,
    },
  });
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "grid size-10 place-items-center rounded-10 bg-muted text-foreground [&_svg:not([class*='size-'])]:size-5",
        image:
          "size-10 overflow-hidden rounded-10 group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** km.css `.list-row .lead`. */
function ItemMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant }), className)}
      {...props}
    />
  );
}

/** km.css `.list-row .body`. */
function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 [&+[data-slot=item-content]]:flex-none",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.list-row .title`. */
function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn(
        "flex w-fit min-w-0 items-center gap-s2 text-base leading-heading font-semibold [overflow-wrap:anywhere] group-data-[size=xs]/item:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.list-row .meta`. */
function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn(
        "m-0 text-left text-sm font-regular text-muted-foreground [overflow-wrap:anywhere] group-data-[size=xs]/item:text-xs [&>a]:text-ember-text [&>a]:underline [&>a]:underline-offset-[3px]",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.list-row .trail`: wraps below the body under 768px. */
function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn(
        "flex flex-wrap items-center justify-end gap-s2 max-bp768:basis-full max-bp768:justify-start",
        className,
      )}
      {...props}
    />
  );
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-header"
      className={cn("flex basis-full items-center justify-between gap-s2", className)}
      {...props}
    />
  );
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-footer"
      className={cn("flex basis-full items-center justify-between gap-s2", className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
};
