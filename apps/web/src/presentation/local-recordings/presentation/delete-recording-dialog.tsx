// TJ-ARCH-MOB-001 compliant
// "Delete this recording?" (shape recordings-library.md §6, §7, RL-9): the kit
// AlertDialog opened by the detail's Delete button. Focus starts on Cancel (a
// destructive action is never the default); Escape cancels and focus returns to Delete.
// It stays open while deleting (spinner, "Deleting...") and on failure, whose line sits
// inside the description so `aria-describedby` reads it. On success the screen closes
// it and moves focus itself (`returnFocus={false}`).
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
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Spinner } from "@know-meet/ui/components/spinner";
import { useId } from "react";

export const DELETE_FAILED_TEXT = "Couldn't delete. Close other Know Meet tabs and try again.";

interface DeleteRecordingDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** "214 MB", for "The 214 MB file is removed…". */
  readonly size: string;
  readonly pending: boolean;
  readonly failed: boolean;
  readonly returnFocus: boolean;
  readonly onConfirm: () => void;
}

export function DeleteRecordingDialog({
  open,
  onOpenChange,
  size,
  pending,
  failed,
  returnFocus,
  onConfirm,
}: DeleteRecordingDialogProps) {
  const cancelId = useId();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
        <KmIcon name="trash" />
        <span>Delete</span>
      </AlertDialogTrigger>
      <AlertDialogContent
        initialFocus={() => document.getElementById(cancelId)}
        finalFocus={returnFocus}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this recording?</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <p className="m-0">
              The {size} file is removed from this browser. Download it first if you want to keep a
              copy. This can't be undone.
            </p>
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
              "Delete recording"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
