// TJ-ARCH-MOB-001 compliant
// Two prototype controls on one primitive:
//   TabsList variant default   → km.css `.tabs` (underline, 2px ember on the active tab)
//   TabsList variant segmented → km.css `.seg` (muted track, raised pressed segment)
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-s4 data-horizontal:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva("group/tabs-list flex group-data-vertical/tabs:flex-col", {
  variants: {
    variant: {
      default:
        "w-full gap-s1 overflow-x-auto [scrollbar-width:none] shadow-[inset_0_-1px_0_var(--muted)] group-data-vertical/tabs:w-fit group-data-vertical/tabs:shadow-[inset_-1px_0_0_var(--muted)] [&::-webkit-scrollbar]:hidden",
      segmented: "inline-flex w-fit flex-wrap gap-1 rounded-base bg-muted p-1",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex flex-none items-center gap-1.5 border-0 bg-transparent text-sm font-semibold whitespace-nowrap text-muted-foreground no-underline transition-[color,background-color,box-shadow] duration-(--dur-fast) ease-standard hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:min-h-11 group-data-[variant=default]/tabs-list:rounded-t-8 group-data-[variant=default]/tabs-list:px-s3 group-data-[variant=default]/tabs-list:data-active:shadow-[inset_0_-2px_0_var(--ember)]",
        "group-data-vertical/tabs:group-data-[variant=default]/tabs-list:rounded-t-none group-data-vertical/tabs:group-data-[variant=default]/tabs-list:rounded-l-8 group-data-vertical/tabs:group-data-[variant=default]/tabs-list:data-active:shadow-[inset_-2px_0_0_var(--ember)]",
        "group-data-[variant=segmented]/tabs-list:min-h-9 group-data-[variant=segmented]/tabs-list:rounded-9 group-data-[variant=segmented]/tabs-list:px-s3 group-data-[variant=segmented]/tabs-list:data-active:bg-card group-data-[variant=segmented]/tabs-list:data-active:shadow-(--seg-pressed-shadow)",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.tabs .count`: a mono count pill inside a tab label. */
function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        "rounded-pill bg-muted px-1.5 py-px font-mono text-11 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Panels get an offset focus ring (km.css `[role=tabpanel]:focus-visible`). */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 focus-visible:outline-offset-4", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger, tabsListVariants };
