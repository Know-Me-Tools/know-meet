// TJ-ARCH-MOB-001 compliant
// km.css `.appnav` on tokens v1.3.0 (DESIGN.md "Inline links"): 44px pill links,
// sub text, card-hov hover; the current page (`aria-current="page"` or Base UI
// `data-active`) is `selected` with `on-selected` text; focus is the `focus` fill.
// Popups use the `.menu` surface (bg-2, radius-tile, float shadow) and items the
// `.menu-item` look. The adaptive bar/rail/inline nav lives in the app frame (c09).
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "#lib/utils";

function NavigationMenu({
  align = "start",
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Root.Props & Pick<NavigationMenuPrimitive.Positioner.Props, "align">) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn(
        "group/navigation-menu relative flex max-w-max min-w-0 flex-1 items-center",
        className,
      )}
      {...props}
    >
      {children}
      <NavigationMenuPositioner align={align} />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group m-0 flex flex-1 list-none items-center gap-0.5 p-0", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

const navigationMenuTriggerStyle = cva(
  "group/navigation-menu-trigger inline-flex min-h-size-target w-max items-center justify-center gap-s2 rounded-pill bg-transparent px-3.5 text-sm font-semibold whitespace-nowrap text-muted-foreground no-underline transition-[background-color,color] duration-(--dur-fast) ease-standard hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-[current=page]:bg-selected aria-[current=page]:text-on-selected data-active:bg-selected data-active:text-on-selected outline-none focus-visible:bg-focus! focus-visible:text-on-focus! data-popup-open:bg-accent data-popup-open:text-foreground data-open:bg-accent data-open:text-foreground",
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-px size-4 transition-transform duration-(--dur) ease-out group-data-popup-open/navigation-menu-trigger:rotate-180 group-data-open/navigation-menu-trigger:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "h-full w-auto p-s2 transition-[opacity,transform,translate] duration-(--dur-panel) ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[motion=from-end]:slide-in-from-right-12 data-[motion=from-start]:slide-in-from-left-12 data-[motion=to-end]:slide-out-to-right-12 data-[motion=to-start]:slide-out-to-left-12 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out group-data-[viewport=false]/navigation-menu:rounded-tile group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow-(--shadow-float)",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  ...props
}: NavigationMenuPrimitive.Positioner.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "isolate z-(--z-menu) h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-(--dur-panel) ease-out data-instant:transition-none data-[side=bottom]:before:top-[-10px] data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0",
          className,
        )}
        {...props}
      >
        <NavigationMenuPrimitive.Popup className="relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) rounded-tile bg-popover text-popover-foreground shadow-(--shadow-float) transition-[opacity,transform,width,height,scale,translate] duration-(--dur-panel) ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:duration-(--dur-exit) data-ending-style:ease-in data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        navigationMenuTriggerStyle(),
        "in-data-[slot=navigation-menu-content]:flex in-data-[slot=navigation-menu-content]:w-full in-data-[slot=navigation-menu-content]:justify-start in-data-[slot=navigation-menu-content]:rounded-10 in-data-[slot=navigation-menu-content]:px-s3 in-data-[slot=navigation-menu-content]:font-medium in-data-[slot=navigation-menu-content]:text-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof NavigationMenuPrimitive.Icon>) {
  return (
    <NavigationMenuPrimitive.Icon
      data-slot="navigation-menu-indicator"
      className={cn(
        "top-full z-(--z-raised) flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in",
        className,
      )}
      {...props}
    >
      <div className="relative top-[60%] size-2 rotate-45 rounded-tl-2 bg-popover" />
    </NavigationMenuPrimitive.Icon>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
};
