// TJ-ARCH-MOB-001 compliant
// settings.html `#calendars`: one panel per provider (Google, Microsoft 365,
// iCloud / CalDAV). Connected providers list their calendars, the KnowMe-link
// switch, the sync window and Sync now / Disconnect; others link to the connect
// flow (`#calendar-connect:<provider>`).
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useId, useState } from "react";
import type { SessionUserView } from "../../shared/session";
import { formatTime } from "../../workspace/application/format";
import { CALENDAR_CONNECTIONS, CALENDAR_ORDER, CALENDAR_PROVIDERS } from "../application/settings-fixtures";
import type { CalendarConnection, CalendarProvider } from "../domain/settings";
import { ConfirmDialog, type ConfirmRequest } from "./confirm-dialog";
import { CheckRow, SelectField, SwitchRow } from "./settings-fields";
import { BusyContent, NeutralChip, PanelSurface, StatusChip } from "./settings-parts";
import { SettingsHead } from "./settings-shell";
import { useBusyAction } from "./use-static-delay";
import { SettingsLink } from "./settings-link";

/** settings.html `.prov-mark`: the provider's letter mark on a muted tile. */
export function ProviderMark({ mark }: { readonly mark: string }) {
  return (
    <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-base bg-muted font-display text-15 font-bold text-foreground">
      {mark}
    </span>
  );
}

function ConnectedBody({ provider, connection, onDisconnect }: {
  readonly provider: CalendarProvider;
  readonly connection: CalendarConnection;
  readonly onDisconnect: () => void;
}) {
  const [selected, setSelected] = useState(connection.selected);
  const [addLink, setAddLink] = useState(connection.addLink);
  const [syncWindow, setSyncWindow] = useState<string>(connection.window);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const syncing = useBusyAction();
  const legendId = useId();
  return (
    <>
      <div className="grid min-w-0">
        <span id={legendId} className="mb-1.5 text-sm font-semibold">
          Calendars to sync
        </span>
        <div role="group" aria-labelledby={legendId}>
          {provider.calendars.map((cal) => (
            <CheckRow
              key={cal.id}
              id={`c-${provider.key}-${cal.id}`}
              label={cal.label}
              checked={selected[cal.id] === true}
              onCheckedChange={(checked) => {
                const next = { ...selected, [cal.id]: checked };
                if (!Object.values(next).some(Boolean)) {
                  toast.add({ title: "Keep at least one calendar selected, or disconnect instead", type: "error" });
                  return;
                }
                setSelected(next);
                toast.add({ title: "Saved", type: "success" });
              }}
            />
          ))}
        </div>
      </div>
      <SwitchRow
        label="Add KnowMe link to events I create"
        description="Adds the join link, dial-in number and PIN to the event description."
        checked={addLink}
        onCheckedChange={setAddLink}
      />
      <SelectField
        label="Sync window"
        value={syncWindow}
        options={[["14", "Next 2 weeks"], ["30", "Next 30 days"], ["90", "Next 90 days"]]}
        onValueChange={setSyncWindow}
      />
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {lastSync === null ? "Synced automatically every 5 minutes" : `Last synced ${lastSync}`}
        </span>
        <div className="flex flex-wrap items-center gap-s2">
          <Button
            variant="secondary"
            size="sm"
            disabled={syncing.busy}
            aria-busy={syncing.busy || undefined}
            onClick={() =>
              syncing.start(1400, () => {
                setLastSync(`Today at ${formatTime(new Date())}`);
                toast.add({ title: `${provider.name} synced`, type: "success" });
              })
            }
          >
            <BusyContent busy={syncing.busy} busyLabel="Syncing…" icon="refresh">
              Sync now
            </BusyContent>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setConfirm({
                title: `Disconnect ${provider.name}?`,
                body: "Upcoming events from this calendar disappear from KnowMe, and new events you create there won’t get a KnowMe link. Meetings already scheduled keep their links.",
                confirmLabel: "Disconnect",
                tone: "danger",
                onConfirm: () => {
                  toast.add({ title: `${provider.name} disconnected`, type: "success" });
                  onDisconnect();
                },
              })
            }
          >
            Disconnect
          </Button>
        </div>
      </div>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}

function ProviderPanel({ provider, email }: { readonly provider: CalendarProvider; readonly email: string }) {
  const [connection, setConnection] = useState(CALENDAR_CONNECTIONS[provider.key]);
  const headingId = useId();
  const account = provider.key === "caldav" ? `${connection.user ?? ""} · ${connection.server ?? ""}` : email;
  return (
    <PanelSurface aria-labelledby={headingId}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-s4 max-bp768:grid-cols-[auto_minmax(0,1fr)]">
        <ProviderMark mark={provider.mark} />
        <div className="grid min-w-0 gap-s2">
          <h2 id={headingId} className="text-lg">
            {provider.name}
          </h2>
          <span className="truncate text-sm text-muted-foreground" title={connection.connected ? account : undefined}>
            {connection.connected ? account : "Not connected"}
          </span>
        </div>
        <span className="max-bp768:col-start-2 max-bp768:row-start-1 max-bp768:justify-self-start">
          {connection.connected ? <StatusChip tone="green">Connected</StatusChip> : <NeutralChip>Not connected</NeutralChip>}
        </span>
      </div>
      <div className="grid min-w-0 gap-s3">
          {connection.connected ? (
            <ConnectedBody provider={provider} connection={connection} onDisconnect={() => setConnection({ ...connection, connected: false })} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {provider.key === "caldav"
                  ? "Connect iCloud or any CalDAV server with an app-specific password."
                  : `Sign in with ${provider.name.split(" /")[0]} to sync events and add KnowMe links.`}
              </p>
              <div>
                <SettingsLink hash={`calendar-connect:${provider.key}`} className={cn(buttonVariants({ size: "sm" }), focusFillClass)}>
                  <KmIcon name="link" className="size-4" />
                  <span>Connect</span>
                </SettingsLink>
              </div>
            </>
          )}
      </div>
    </PanelSurface>
  );
}

export function CalendarsSection({ user }: { readonly user: SessionUserView }) {
  return (
    <>
      <SettingsHead
        section="calendars"
        title="Calendars"
        description="Connected calendars show your upcoming meetings and get a KnowMe link added to events you create."
      />
      {CALENDAR_ORDER.map((key) => (
        <ProviderPanel key={key} provider={CALENDAR_PROVIDERS[key]} email={user.email} />
      ))}
    </>
  );
}
