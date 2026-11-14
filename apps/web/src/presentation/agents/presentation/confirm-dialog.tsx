// TJ-ARCH-MOB-001 compliant
// km.js `KM.confirm({ danger: true })` on the kit AlertDialog: a title, the
// consequence copy, Cancel (raised) and the destructive action. Focus returns to
// the trigger when it closes (Base UI).
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@know-meet/ui/components/alert-dialog";
import type * as React from "react";

interface ConfirmDialogProps {
  /** The trigger element (e.g. a kit Button) rendered in place. */
  readonly trigger: React.ReactElement;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly confirmLabel: string;
  readonly onConfirm: () => void;
}

export function ConfirmDialog({
  trigger,
  title,
  children,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription render={<div className="grid gap-s2" />}>
            {children}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
