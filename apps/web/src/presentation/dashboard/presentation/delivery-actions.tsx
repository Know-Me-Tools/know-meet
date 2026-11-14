// TJ-ARCH-MOB-001 compliant
// Row actions for invite deliveries (dashboard.html `resend` / `sendEmailInstead`):
// each button shows its own busy state, then reports the outcome in a toast with
// cause-then-fix copy (F9: never a raw code).
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { cn } from "@know-meet/ui/lib/utils";
import { useState } from "react";
import type { Delivery } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { busySpinClass } from "./dashboard-parts";

interface ActionButtonProps {
  readonly label: string;
  readonly busyLabel: string;
  readonly icon: "refresh" | "mail";
  readonly ariaLabel?: string;
  readonly primary?: boolean;
  readonly run: () => Promise<void>;
}

function ActionButton({ label, busyLabel, icon, ariaLabel, primary, run }: ActionButtonProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={primary ? "default" : "secondary"}
      disabled={busy}
      aria-busy={busy || undefined}
      aria-label={busy ? undefined : ariaLabel}
      onClick={() => {
        setBusy(true);
        void run().finally(() => setBusy(false));
      }}
    >
      <KmIcon name={busy ? "refresh" : icon} className={cn("size-4", busy && busySpinClass)} />
      <span>{busy ? busyLabel : label}</span>
    </Button>
  );
}

export function SendEmailInsteadButton({ delivery }: { readonly delivery: Delivery }) {
  const { sendEmailInstead } = useDashboard();
  return (
    <ActionButton
      primary
      icon="mail"
      label="Send email instead"
      busyLabel="Sending…"
      ariaLabel={`Send email instead to ${delivery.name}`}
      run={async () => {
        try {
          const email = await sendEmailInstead(delivery);
          toast.add({ title: `Email invite sent to ${email}`, type: "success" });
        } catch (error) {
          toast.add({
            title:
              error instanceof Error ? error.message : "Couldn’t send the email invite. Try again.",
            type: "error",
          });
        }
      }}
    />
  );
}

/** Resends one or more deliveries; `name` is used for the toast and the accessible name. */
export function ResendButton({
  deliveries,
  ariaLabel,
  name,
}: {
  readonly deliveries: readonly Delivery[];
  readonly ariaLabel: string;
  readonly name: string;
}) {
  const { resend } = useDashboard();
  return (
    <ActionButton
      icon="refresh"
      label="Resend"
      busyLabel="Resending…"
      ariaLabel={ariaLabel}
      run={async () => {
        const results = await Promise.all(deliveries.map(resend));
        const stillFailed = results.filter((r) => r.status === "failed").length;
        toast.add(
          stillFailed
            ? {
                title:
                  deliveries.length === 1
                    ? "SMS still undeliverable — this number is a landline. Send email instead."
                    : "Email/calendar resent. SMS still undeliverable — send email instead.",
                type: "warning",
              }
            : { title: `Invite resent to ${name}`, type: "success" },
        );
      }}
    />
  );
}

/** Bulk resend (invites view): "Resend failed (n)" / "Resend selected (n)". */
export function BulkResendButton({
  deliveries,
  label,
  primary,
  icon,
  onDone,
}: {
  readonly deliveries: readonly Delivery[];
  readonly label: string;
  readonly primary?: boolean;
  readonly icon: "refresh" | "alert";
  readonly onDone: () => void;
}) {
  const { resend } = useDashboard();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={primary ? "default" : "secondary"}
      disabled={busy || deliveries.length === 0}
      aria-busy={busy || undefined}
      onClick={() => {
        setBusy(true);
        void Promise.all(deliveries.map(resend)).then((results) => {
          const still = results.filter((r) => r.status === "failed").length;
          const ok = results.length - still;
          toast.add({
            title: `${ok ? `Resent ${ok}${ok === 1 ? " invite" : " invites"}` : "Nothing resent"}${still ? `. ${still} SMS still undeliverable — send email instead.` : ""}`,
            type: still ? "warning" : "success",
          });
          setBusy(false);
          onDone();
        });
      }}
    >
      <KmIcon name={busy ? "refresh" : icon} className={cn("size-4", busy && busySpinClass)} />
      <span>{busy ? `Resending ${deliveries.length}…` : label}</span>
    </Button>
  );
}
