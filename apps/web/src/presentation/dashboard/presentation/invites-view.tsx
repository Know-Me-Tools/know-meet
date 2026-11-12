// TJ-ARCH-MOB-001 compliant
// dashboard.html `#invites`: every invite sent for upcoming meetings, filterable by
// channel, status and text; failed first. Rows can be selected and resent in bulk.
// The table scrolls in its own named region when it is wider than the page.
import { buttonVariants } from "@know-meet/ui/components/button";
import { Checkbox } from "@know-meet/ui/components/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@know-meet/ui/components/empty";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { NativeSelect, NativeSelectOption } from "@know-meet/ui/components/native-select";
import {
  PageActions,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { TableRegion } from "@know-meet/ui/components/table-region";
import { ToggleGroup, ToggleGroupItem } from "@know-meet/ui/components/toggle-group";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { formatDate, formatTime } from "../../workspace/application/format";
import {
  CHANNEL_LABEL,
  type Delivery,
  type DeliveryChannel,
  isOpenFailure,
} from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { ChannelChip, DashTabs, ResolvedByEmailChip, StatusChip } from "./dashboard-parts";
import { BulkResendButton, ResendButton, SendEmailInsteadButton } from "./delivery-actions";

type ChannelFilter = "all" | DeliveryChannel;
type StatusFilter = "all" | "delivered" | "opened" | "queued" | "failed";

const CHANNELS: readonly { readonly key: ChannelFilter; readonly label: string }[] = [
  { key: "all", label: "All" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "calendar", label: "Calendar" },
];

const STATUSES: readonly { readonly key: StatusFilter; readonly label: string }[] = [
  { key: "all", label: "Any status" },
  { key: "delivered", label: "Delivered" },
  { key: "opened", label: "Opened" },
  { key: "queued", label: "Queued" },
  { key: "failed", label: "Failed" },
];

interface Filters {
  readonly channel: ChannelFilter;
  readonly status: StatusFilter;
  readonly q: string;
}

const NO_FILTERS: Filters = { channel: "all", status: "all", q: "" };

function isChannel(v: unknown): v is ChannelFilter {
  return CHANNELS.some((c) => c.key === v);
}

function isStatus(v: string): v is StatusFilter {
  return STATUSES.some((s) => s.key === v);
}

export function InvitesView() {
  useDocumentTitle("Invites · Know Meet");
  const { deliveries, getMeeting } = useDashboard();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const startOf = (d: Delivery) => new Date(getMeeting(d.meetingId)?.start ?? 0).getTime();
  const q = filters.q.trim().toLowerCase();
  const rows = deliveries
    .filter((d) => {
      if (filters.channel !== "all" && d.channel !== filters.channel) return false;
      if (filters.status === "failed" && !isOpenFailure(d)) return false;
      if (filters.status !== "all" && filters.status !== "failed" && d.status !== filters.status)
        return false;
      const title = getMeeting(d.meetingId)?.title ?? "";
      return q === "" || `${d.name} ${d.to ?? ""} ${title}`.toLowerCase().includes(q);
    })
    .sort(
      (a, b) => Number(!isOpenFailure(a)) - Number(!isOpenFailure(b)) || startOf(a) - startOf(b),
    );
  const shownSelected = rows.filter((d) => selected.has(d.id));
  const failedAll = deliveries.filter(isOpenFailure);
  const allSelected = rows.length > 0 && shownSelected.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageTitle>Invites</PageTitle>
          <PageSub>
            Every invite you’ve sent for upcoming meetings, with delivery status by email, SMS and
            calendar.
          </PageSub>
        </PageHeadText>
        <PageActions>
          <Link to="/dashboard" hash="schedule" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="plus" />
            <span>Schedule meeting</span>
          </Link>
        </PageActions>
      </PageHead>
      <DashTabs active="invites" />
      <div className="mb-s4 flex flex-wrap items-center justify-between gap-s3">
        <ToggleGroup
          aria-label="Filter by channel"
          value={[filters.channel]}
          onValueChange={(value) => {
            const next = value[0];
            if (isChannel(next)) setFilters((f) => ({ ...f, channel: next }));
          }}
        >
          {CHANNELS.map((c) => (
            <ToggleGroupItem key={c.key} value={c.key}>
              {c.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="inv-status" className="sr-only">
            Status
          </label>
          <NativeSelect
            id="inv-status"
            className="w-auto"
            value={filters.status}
            onChange={(e) => {
              const next = e.target.value;
              if (isStatus(next)) setFilters((f) => ({ ...f, status: next }));
            }}
          >
            {STATUSES.map((s) => (
              <NativeSelectOption key={s.key} value={s.key}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <div className="relative max-w-[360px] flex-[1_1_220px]">
            <KmIcon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            />
            <label htmlFor="inv-search" className="sr-only">
              Search invites
            </label>
            <Input
              id="inv-search"
              type="search"
              autoComplete="off"
              placeholder="Search name, email, phone or meeting"
              className="min-h-size-target pl-[42px]"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
        </div>
      </div>
      <div className="mb-s4 flex flex-wrap items-center justify-between gap-s3">
        <span role="status" className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "invite" : "invites"}
        </span>
        <div className="flex flex-wrap items-center gap-s2">
          <BulkResendButton
            deliveries={failedAll}
            icon="alert"
            label={`Resend failed (${failedAll.length})`}
            onDone={() => setSelected(new Set())}
          />
          <BulkResendButton
            primary
            deliveries={shownSelected}
            icon="refresh"
            label={`Resend selected (${shownSelected.length})`}
            onDone={() => setSelected(new Set())}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KmIcon name="filter" />
            </EmptyMedia>
            <EmptyTitle>No invites match these filters</EmptyTitle>
            <EmptyDescription>Try another channel or status, or clear the search.</EmptyDescription>
          </EmptyHeader>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
            onClick={() => setFilters(NO_FILTERS)}
          >
            Clear filters
          </button>
        </Empty>
      ) : (
        <TableRegion caption="Sent invites with delivery status">
          <thead>
            <tr>
              <th scope="col" className="w-[1%]">
                <Checkbox
                  aria-label={`Select all ${rows.length} shown invites`}
                  checked={allSelected}
                  indeterminate={!allSelected && shownSelected.length > 0}
                  onCheckedChange={(on) =>
                    setSelected(on ? new Set(rows.map((d) => d.id)) : new Set())
                  }
                />
              </th>
              <th scope="col">Invitee</th>
              <th scope="col">Meeting</th>
              <th scope="col">Channel</th>
              <th scope="col">Status</th>
              <th scope="col">Sent</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <InviteRow
                key={d.id}
                delivery={d}
                checked={selected.has(d.id)}
                onToggle={(on) => toggle(d.id, on)}
              />
            ))}
          </tbody>
        </TableRegion>
      )}
    </>
  );
}

function InviteRow({
  delivery: d,
  checked,
  onToggle,
}: {
  readonly delivery: Delivery;
  readonly checked: boolean;
  readonly onToggle: (on: boolean) => void;
}) {
  const { getMeeting } = useDashboard();
  const meeting = getMeeting(d.meetingId);
  if (meeting === null) return null;
  const failed = isOpenFailure(d);
  const channel = CHANNEL_LABEL[d.channel];
  return (
    <tr>
      <td className="w-[1%]">
        <Checkbox
          aria-label={`Select invite to ${d.name} by ${channel} for ${meeting.title}`}
          checked={checked}
          onCheckedChange={onToggle}
        />
      </td>
      <td>
        <div className="grid min-w-40 gap-0.5 *:block">
          <strong>{d.name}</strong>
          <span className="text-xs text-muted-foreground">{d.to ?? ""}</span>
        </div>
      </td>
      <td>
        <Link
          to="/dashboard"
          hash={`meeting:${meeting.id}`}
          title={meeting.title}
          className="block max-w-[28ch] truncate"
        >
          {meeting.title}
        </Link>
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatDate(meeting.start)}
        </span>
      </td>
      <td>
        <ChannelChip channel={d.channel} />
      </td>
      <td>
        {d.resolvedByEmail ? (
          <ResolvedByEmailChip label="Failed · email sent instead" />
        ) : (
          <StatusChip status={d.status} />
        )}
        {failed ? (
          <p className="max-w-[34ch] text-xs text-muted-foreground">
            {d.reason}. Suggestion: send an email invite instead.
          </p>
        ) : null}
      </td>
      <td>
        <span className="text-sm whitespace-nowrap">
          {d.resentAt ? `Resent ${formatTime(d.resentAt)}` : formatDate(d.sentAt)}
        </span>
      </td>
      <td className="w-[1%]">
        <div className="flex flex-wrap justify-end gap-s2">
          {failed && d.landline ? <SendEmailInsteadButton delivery={d} /> : null}
          <ResendButton
            deliveries={[d]}
            name={d.name}
            ariaLabel={`Resend ${channel} invite to ${d.name}`}
          />
        </div>
      </td>
    </tr>
  );
}
