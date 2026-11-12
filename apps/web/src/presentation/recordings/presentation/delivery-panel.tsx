// TJ-ARCH-MOB-001 compliant
// `#detail:<id>:delivery`: who received the transcript and summary at close.
// A held summary shows the review note with "Review done — send now" (confirm).
// The receipts table is a named, focusable scroll region when it overflows
// (RV-21/RV-23). Statuses are human-readable words with a pip (never colour or a
// raw code alone); a bounce explains the cause, then the fix.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { TableRegion } from "@know-meet/ui/components/table-region";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { initialsOf } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import type { DeliveryChannel, DeliveryReceipts, DeliveryRow, DeliveryStatus } from "../domain/recording-details";
import { deliveryRows, isHeldForReview } from "../application/recordings-model";
import { detailHash } from "../application/recordings-route";
import { BusyLabel } from "./busy-label";
import { ConfirmDialog } from "./confirm-dialog";
import { Note, StatusChip } from "./recording-parts";
import { useBusyTimer } from "./use-busy-timer";

function rowKey(row: DeliveryRow): string {
  return `${row.name}:${row.channel}`;
}

function markAll(receipts: DeliveryReceipts, status: DeliveryStatus): DeliveryReceipts {
  const next: Record<string, Partial<Record<DeliveryChannel, DeliveryStatus>>> = {};
  for (const [name, channels] of Object.entries(receipts)) {
    next[name] = {
      ...(channels.email === undefined ? {} : { email: status }),
      ...(channels.sms === undefined ? {} : { sms: status }),
    };
  }
  return next;
}

export function DeliveryPanel({
  workspace,
  recording,
  initialReceipts,
}: {
  readonly workspace: Workspace;
  readonly recording: Recording;
  readonly initialReceipts: DeliveryReceipts;
}) {
  const [receipts, setReceipts] = useState<DeliveryReceipts>(initialReceipts);
  const [confirming, setConfirming] = useState(false);
  const { busy, run } = useBusyTimer();
  const held = isHeldForReview(recording, receipts);
  const rows = deliveryRows(workspace, recording, receipts);
  const participants = Object.keys(receipts).length;

  const sendAll = () =>
    run("send-all", 1400, () => {
      setReceipts((current) => markAll(current, "Delivered"));
      toast.add({ title: `Summary sent to ${participants} participants`, type: "success" });
    });

  const resend = (row: DeliveryRow) =>
    run(rowKey(row), 1200, () => {
      setReceipts((current) => ({ ...current, [row.name]: { ...current[row.name], [row.channel]: "Delivered" } }));
      toast.add({
        title: `${row.channel === "sms" ? "SMS link resent to " : "Email resent to "}${row.name}`,
        type: "success",
      });
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <div className="grid gap-s2">
          <h2 id="tab-h">Delivery</h2>
          <p className="text-sm text-muted-foreground">
            Who received the transcript and summary when the meeting closed. SMS messages carry a link, sent via Telnyx.
          </p>
        </div>
        <Link to="/settings" hash="delivery" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}>
          <KmIcon name="settings" className="size-4" />
          <span>Delivery settings</span>
        </Link>
      </div>
      {held ? (
        <Note kind="warn" icon="clock">
          <div className="grid gap-s2">
            <span>
              This summary is held for your review because delivery timing was set to “After I review”. Nothing has been
              sent yet.
            </span>
            <div className="flex flex-wrap items-center gap-s2">
              <Button size="sm" disabled={busy.has("send-all")} aria-busy={busy.has("send-all")} onClick={() => setConfirming(true)}>
                {busy.has("send-all") ? (
                  <BusyLabel label="Sending…" />
                ) : (
                  <>
                    <KmIcon name="send" className="size-4" />
                    <span>Review done — send now</span>
                  </>
                )}
              </Button>
              <Link
                to="/recordings"
                hash={detailHash(recording.id, "summary")}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
              >
                <span>Review summary</span>
              </Link>
            </div>
          </div>
        </Note>
      ) : null}
      <TableRegion caption="Delivery status per participant and channel">
        <thead>
          <tr>
            <th scope="col">Participant</th>
            <th scope="col">Channel</th>
            <th scope="col">Sent to</th>
            <th scope="col">Status</th>
            <th scope="col" className="text-right!">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const sending = busy.has(rowKey(row));
            const verb = row.status === "Held for review" ? "Send" : "Resend";
            const label = `${verb} ${row.label} to ${row.name}`;
            return (
              <tr key={rowKey(row)}>
                <td>
                  <div className="flex items-center gap-s2">
                    <span
                      aria-hidden="true"
                      className="inline-grid size-8 flex-none place-items-center rounded-round bg-card font-display text-xs leading-none font-semibold uppercase"
                    >
                      {initialsOf(row.name)}
                    </span>
                    <span className="truncate" title={row.name}>
                      {row.name}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="flex items-center gap-s2">
                    <KmIcon name={row.channel === "sms" ? "sms" : "mail"} className="size-4" />
                    <span className="whitespace-nowrap">{row.label}</span>
                  </span>
                </td>
                <td>
                  <span className="font-mono text-13 [overflow-wrap:anywhere]">{row.destination}</span>
                </td>
                <td>
                  <StatusChip status={sending ? "Sending…" : row.status} />
                </td>
                <td className="text-right! tabular-nums">
                  <Button variant="secondary" size="sm" aria-label={label} aria-busy={sending} disabled={sending} onClick={() => resend(row)}>
                    {sending ? (
                      <BusyLabel label="Sending…" />
                    ) : (
                      <>
                        <KmIcon name="refresh" className="size-4" />
                        <span>{verb}</span>
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableRegion>
      {rows.some((row) => row.status === "Bounced") ? (
        <Note kind="err" icon="alert">
          One email bounced. Check the address with the participant, then resend. Their SMS link was delivered, so they
          still have access.
        </Note>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Opened is reported for email only. SMS status comes from Telnyx delivery receipts. Recipients without a KnowMe
        account can open the link without signing in until it expires.
      </p>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Send summary to all participants?"
        confirmLabel="Send now"
        onConfirm={sendAll}
      >
        The transcript and summary will be emailed to every participant, and an SMS link sent to those with a phone number.
      </ConfirmDialog>
    </>
  );
}
