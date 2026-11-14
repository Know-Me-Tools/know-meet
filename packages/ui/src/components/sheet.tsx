// TJ-ARCH-MOB-001 compliant
// km.css `.sheet`: a `size-sheet-w` (440px, at most 100vw - 32px) side slide-over
// on bg-2 with the float shadow; header / scrolling body (SheetBody, `.sheet-body`)
// / footer rows. Flat 2.0 (D-6): the footer rule is gone; spacing (s3) separates
// it. Enter uses --dur-panel with
// ease-out, exit --dur-exit with ease-in. Other sides keep the same surface.
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "#components/button";
import {
  overlayCloseClass,
  overlayDescriptionClass,
  overlayFooterClass,
  overlayHeaderClass,
  overlayTitleClass,
} from "#lib/overlay-styles";
import { cn } from "#lib/utils";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

/** km.css `.sheet-scrim`. */
function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-(--z-scrim) bg-scrim transition-opacity duration-(--dur-panel) ease-out data-ending-style:opacity-0 data-ending-style:duration-(--dur-exit) data-ending-style:ease-in data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-(--z-sheet) grid grid-rows-[auto_minmax(0,1fr)_auto] bg-popover text-popover-foreground shadow-(--shadow-float) outline-none transition-transform duration-(--dur-panel) ease-out data-ending-style:duration-(--dur-exit) data-ending-style:ease-in",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:w-[min(var(--spacing-size-sheet-w),calc(100vw-32px))] data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-[min(var(--spacing-size-sheet-w),calc(100vw-32px))] data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:max-h-[85dvh] data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:max-h-[85dvh] data-[side=bottom]:rounded-t-lg data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" size="icon" className={overlayCloseClass} />}
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn(overlayHeaderClass, className)} {...props} />;
}

/** km.css `.sheet-body`: scrolls on its own; overscroll stays inside the sheet. */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn(
        "grid min-h-0 content-start gap-s4 overflow-y-auto overscroll-contain px-s5 pb-s5",
        className,
      )}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(overlayFooterClass, "row-start-3", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(overlayTitleClass, className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(overlayDescriptionClass, className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
