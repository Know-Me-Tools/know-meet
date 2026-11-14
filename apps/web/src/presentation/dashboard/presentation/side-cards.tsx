// TJ-ARCH-MOB-001 compliant
// dashboard.html `calendarsCard` and `deliveryCard`: the connected calendars with
// a simulated "Sync now" (status announced politely), and the invite delivery tally.
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { Card, CardHeader } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "../../workspace/application/format";
import { CALENDAR_ACCOUNTS } from "../application/dashboard-fixtures";
import { type DeliveryStatus, isOpenFailure } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { busySpinClass, ConnectedChip, smallLinkClass } from "./dashboard-parts";

const MINUTE_MS = 60_000;
const SYNC_MS = 1400;

function CalendarRow({
  name,
  account,
  connected,
}: {
  readonly name: string;
  readonly account: string;
  readonly connected: boolean;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s3 py-s2 not-first:pt-s3">
      <span className="grid size-9 place-items-center rounded-10 bg-muted">
        <KmIcon name="calendar" className="size-4" />
      </span>
      <span className="grid min-w-0 gap-0.5 *:block">
        <strong className="text-sm">{name}</strong>
        <span className="truncate text-xs text-muted-foreground" title={account}>
          {account}
        </span>
      </span>
      {connected ? (
        <ConnectedChip />
      ) : (
        <Link
          to="/settings"
          hash="calendars"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
        >
          Connect
        </Link>
      )}
    </li>
  );
}

type SyncState =
  | { readonly kind: "idle" }
  | { readonly kind: "syncing" }
  | { readonly kind: "done" };

export function CalendarsCard() {
  const { now } = useDashboard();
  const [sync, setSync] = useState<SyncState>({ kind: "idle" });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const lastSync = new Date(now.getTime() - 12 * MINUTE_MS);
  const startSync = () => {
    setSync({ kind: "syncing" });
    timer.current = window.setTimeout(() => setSync({ kind: "done" }), SYNC_MS);
  };
  return (
    <Card role="region" aria-labelledby="cal-title">
      <CardHeader>
        <h2 id="cal-title" className="text-lg">
          Connected calendars
        </h2>
        <span className="text-sm text-muted-foreground">
          KnowMe adds a join link and dial-in to each event.
        </span>
      </CardHeader>
      <ul className="m-0 grid list-none p-0">
        <CalendarRow name="Google Calendar" account={CALENDAR_ACCOUNTS.google.account} connected />
        <CalendarRow name="Outlook" account={CALENDAR_ACCOUNTS.outlook.account} connected />
        <CalendarRow name="CalDAV" account="Not connected" connected={false} />
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          role="status"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          {sync.kind === "idle" ? (
            <>
              <KmIcon name="clock" className="size-4" />
              <span>Last synced {formatTime(lastSync)}</span>
            </>
          ) : null}
          {sync.kind === "syncing" ? <span>Checking Google Calendar and Outlook…</span> : null}
          {sync.kind === "done" ? (
            <>
              <KmIcon name="check" className="size-4 text-green-text" />
              <span>Synced just now</span>
            </>
          ) : null}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={sync.kind === "syncing"}
          aria-busy={sync.kind === "syncing" || undefined}
          onClick={startSync}
        >
          <KmIcon
            name="refresh"
            className={cn("size-4", sync.kind === "syncing" && busySpinClass)}
          />
          <span>{sync.kind === "syncing" ? "Syncing…" : "Sync now"}</span>
        </Button>
      </div>
      <Link to="/settings" hash="calendars" className={smallLinkClass}>
        Manage calendars
      </Link>
    </Card>
  );
}

export function DeliveryCard() {
  const { deliveries } = useDashboard();
  const count = (status: DeliveryStatus) =>
    deliveries.filter((d) => d.status === status && d.resolvedByEmail !== true).length;
  const failed = deliveries.filter(isOpenFailure).length;
  const tally = [
    { label: "Delivered", value: count("delivered") + count("opened") },
    { label: "Queued", value: count("queued") },
    { label: "Failed", value: failed },
  ];
  return (
    <Card role="region" aria-labelledby="del-title">
      <CardHeader>
        <h2 id="del-title" className="text-lg">
          Invite delivery
        </h2>
        <span className="text-sm text-muted-foreground">
          Email, SMS and calendar invites across upcoming meetings.
        </span>
      </CardHeader>
      <div className="grid grid-cols-3 gap-s2">
        {tally.map((t) => (
          <div key={t.label} className="grid gap-0.5 rounded-base bg-card p-s3 *:block">
            <strong className="font-display text-xl tabular-nums">{t.value}</strong>
            <span className="text-xs text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
      {failed ? (
        <p className="flex items-start gap-1.5 text-sm">
          <KmIcon name="alert" className="mt-0.5 size-4" />
          <span>
            {failed === 1
              ? "1 SMS invite couldn’t be delivered."
              : `${failed} invites couldn’t be delivered.`}
          </span>
        </p>
      ) : null}
      <Link
        to="/dashboard"
        hash="invites"
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "justify-self-start",
          focusFillClass,
        )}
      >
        <span>Review invites</span>
        <KmIcon name="chevron-right" className="size-4" />
      </Link>
    </Card>
  );
}
