// TJ-ARCH-MOB-001 compliant
// km.js `KM.confirm({ title, body, confirmLabel, danger })` on the kit alert
// dialog: Cancel (raised) and the confirm action (primary, or danger).
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@know-meet/ui/components/alert-dialog";
import { Button } from "@know-meet/ui/components/button";
import type * as React from "react";

export interface ConfirmRequest {
  readonly title: string;
  readonly body: React.ReactNode;
  readonly confirmLabel: string;
  readonly tone?: "default" | "danger";
  readonly onConfirm: () => void;
}

export function ConfirmDialog({ request, onClose }: { readonly request: ConfirmRequest | null; readonly onClose: () => void }) {
  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      {request === null ? null : (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{request.title}</AlertDialogTitle>
            <AlertDialogDescription>{request.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant={request.tone === "danger" ? "destructive" : "default"}
              onClick={() => {
                onClose();
                request.onConfirm();
              }}
            >
              {request.confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
