// TJ-ARCH-MOB-001 compliant
// Two prototype controls on one primitive, migrated to tokens v1.3.0 (D-6):
//   TabsList variant default   → km.css `.tabs`: no list rule, no underline. Tabs
//                                are transparent `fg-sub` text (the text identifies
//                                them), hover `card-hov`, the active tab is a
//                                `selected` pill with `on-selected` text.
//   TabsList variant segmented → DESIGN.md segmented control: `control` track,
//                                `on-control` segments, active `selected` with a
//                                leading check icon.
// Focus is the `focus` fill on every tab and on a focused panel (lib/focus.ts).
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon } from "lucide-react";
import type * as React from "react";
import { focusFillClass } from "#lib/focus";
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
        "w-full gap-s1 overflow-x-auto [scrollbar-width:none] group-data-vertical/tabs:w-fit [&::-webkit-scrollbar]:hidden",
      segmented: "inline-flex w-fit flex-wrap gap-1 rounded-base bg-control p-1",
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

function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "group/tabs-trigger inline-flex flex-none items-center gap-1.5 bg-transparent text-sm font-semibold whitespace-nowrap no-underline transition-[color,background-color] duration-(--dur-fast) ease-standard disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-active:bg-selected data-active:text-on-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=default]/tabs-list:min-h-size-target group-data-[variant=default]/tabs-list:rounded-pill group-data-[variant=default]/tabs-list:px-s4 group-data-[variant=default]/tabs-list:text-muted-foreground group-data-[variant=default]/tabs-list:hover:not-data-active:bg-accent group-data-[variant=default]/tabs-list:hover:not-data-active:text-foreground",
        "group-data-[variant=segmented]/tabs-list:min-h-size-control-h-sm group-data-[variant=segmented]/tabs-list:rounded-9 group-data-[variant=segmented]/tabs-list:px-s3 group-data-[variant=segmented]/tabs-list:text-on-control group-data-[variant=segmented]/tabs-list:hover:not-data-active:bg-control-hov",
        focusFillClass,
        className,
      )}
      {...props}
    >
      <CheckIcon
        aria-hidden="true"
        data-slot="tabs-trigger-check"
        className="hidden group-data-[variant=segmented]/tabs-list:group-data-active/tabs-trigger:inline-block"
      />
      {children}
    </TabsPrimitive.Tab>
  );
}

/** km.css `.tabs .count`: a mono count pill inside a tab label (inherits the tab text colour). */
function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        "rounded-pill bg-muted px-1.5 py-px font-mono text-11 text-muted-foreground group-data-active/tabs-trigger:bg-transparent group-data-active/tabs-trigger:text-current group-focus-visible/tabs-trigger:bg-transparent group-focus-visible/tabs-trigger:text-current",
        className,
      )}
      {...props}
    />
  );
}

/** A focused panel takes the focus fill like a focused card (DESIGN.md "Interactive card"). */
function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 rounded-base", focusFillClass, className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger, tabsListVariants };
