// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §6–§8, LH-7, LH-8: the kit AlertDialog for "Delete this
// meeting?" and "Delete all history?". Focus starts on Cancel (destructive actions
// are never the default); Escape cancels and focus returns to the opener. The
// dialog stays open while deleting (spinner, "Deleting...") and on failure, whose
// text sits inside the description so `aria-describedby` reads it. On success the
// caller closes it and decides where focus goes (`returnFocus={false}`).
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@know-meet/ui/components/alert-dialog";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Spinner } from "@know-meet/ui/components/spinner";
import type * as React from "react";
import { useId } from "react";

export const DELETE_FAILED_TEXT = "Couldn't delete. Close other Know Meet tabs and try again.";

interface ConfirmDeleteDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly children: React.ReactNode;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly failed: boolean;
  /** False once the delete succeeded: the caller moves focus itself. */
  readonly returnFocus: boolean;
  readonly onConfirm: () => void;
  readonly confirmTestId?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  pending,
  failed,
  returnFocus,
  onConfirm,
  confirmTestId,
}: ConfirmDeleteDialogProps) {
  const cancelId = useId();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        initialFocus={() => document.getElementById(cancelId)}
        finalFocus={returnFocus}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <p className="m-0">{children}</p>
            <p aria-live="polite" className="m-0">
              {failed && !pending ? (
                <span className="mt-s3 flex items-start gap-s2 font-semibold text-foreground">
                  <KmIcon name="alert" className="mt-px size-4 text-red-text" />
                  <span>{DELETE_FAILED_TEXT}</span>
                </span>
              ) : null}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel id={cancelId}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            focusableWhenDisabled
            data-testid={confirmTestId}
            onClick={onConfirm}
          >
            {pending ? (
              <>
                <Spinner
                  aria-hidden="true"
                  role="presentation"
                  className="motion-reduce:animate-none"
                />
                <span>Deleting...</span>
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
