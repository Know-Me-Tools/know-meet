// TJ-ARCH-MOB-001 compliant
// The prototype's confirm dialog (KM.confirm in docs/design/prototype): the same
// surface as Dialog, without a close button; cancel is the raised `.btn`, the
// action is primary (or destructive for irreversible actions). While open, everything
// outside the dialog is inert (lib/inert-outside.ts), so focus cannot leave it.
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type * as React from "react";
import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { Button } from "#components/button";
import { inertOutside } from "#lib/inert-outside";
import {
  centredPopupClass,
  overlayDescriptionClass,
  overlayFooterClass,
  overlayTitleClass,
  scrimClass,
} from "#lib/overlay-styles";
import { cn } from "#lib/utils";

/** Whether the enclosing AlertDialog is open (controlled or not); read by the content. */
const AlertDialogOpenContext = createContext(false);

function AlertDialog({
  open,
  defaultOpen = false,
  onOpenChange,
  ...props
}: AlertDialogPrimitive.Root.Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  type OpenChange = NonNullable<AlertDialogPrimitive.Root.Props["onOpenChange"]>;
  const handleOpenChange = useCallback<OpenChange>(
    (next, details) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next, details);
    },
    [onOpenChange],
  );
  return (
    <AlertDialogOpenContext value={open ?? uncontrolledOpen}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        {...(open === undefined ? {} : { open })}
        defaultOpen={defaultOpen}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </AlertDialogOpenContext>
  );
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(scrimClass, className)}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = "default",
  ref,
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: "default" | "sm";
  ref?: React.Ref<HTMLDivElement>;
}) {
  const open = useContext(AlertDialogOpenContext);
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  // A layout effect, so inert is lifted in the same commit that closes the dialog,
  // before Base UI returns focus to the trigger behind it.
  useLayoutEffect(() => (open && popup !== null ? inertOutside(popup) : undefined), [open, popup]);
  const popupRef = useCallback(
    (node: HTMLDivElement | null) => {
      setPopup(node);
      if (typeof ref === "function") ref(node);
      else if (ref !== null && ref !== undefined) ref.current = node;
    },
    [ref],
  );
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        ref={popupRef}
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          centredPopupClass,
          "group/alert-dialog-content data-[size=sm]:w-[min(400px,calc(100vw-32px))]",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid content-start gap-1 px-s5 pt-s5 pb-s3 has-data-[slot=alert-dialog-media]:grid-cols-[auto_minmax(0,1fr)] has-data-[slot=alert-dialog-media]:gap-x-s4",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        overlayFooterClass,
        "row-start-3 group-data-[size=sm]/alert-dialog-content:*:flex-1",
        className,
      )}
      {...props}
    />
  );
}

/** km.css `.gate-icon`: 48px ember-soft tile for the dialog's icon. */
function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "row-span-2 inline-grid size-12 place-items-center rounded-14 bg-ember-soft text-ember-text [&_svg:not([class*='size-'])]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(overlayTitleClass, className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(overlayDescriptionClass, "text-pretty", className)}
      {...props}
    />
  );
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" className={cn(className)} {...props} />;
}

function AlertDialogCancel({
  className,
  variant = "secondary",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
