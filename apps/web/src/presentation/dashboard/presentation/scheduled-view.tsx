// TJ-ARCH-MOB-001 compliant
// dashboard.html `renderScheduled`: confirmation after scheduling or saving, with
// per-invitee delivery (SMS shows Queued, then Delivered after the prototype's
// delay, announced politely) and the join info.
import { Avatar, AvatarFallback } from "@know-meet/ui/components/avatar";
import { buttonVariants } from "@know-meet/ui/components/button";
import { Card } from "@know-meet/ui/components/card";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageHead, PageHeadText, PageSub, PageTitle } from "@know-meet/ui/components/page-head";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { formatDate, initialsOf } from "../../workspace/application/format";
import { CALENDAR_ACCOUNTS, timeZoneLabel } from "../application/dashboard-fixtures";
import type { DashboardMeeting } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { ChannelChip, CopyLinkButton, MeetingsCrumbs, StatusChip } from "./dashboard-parts";
import { Panel } from "./schedule-sections";

const SMS_SETTLE_MS = 1800;

interface ScheduledViewProps {
  readonly meeting: DashboardMeeting;
  readonly wasEdit: boolean;
  readonly onScheduleAnother: () => void;
}

export function ScheduledView({ meeting, wasEdit, onScheduleAnother }: ScheduledViewProps) {
  useDocumentTitle(`${wasEdit ? "Changes saved" : "Meeting scheduled"} · Know Meet`);
  const { localTz, joinUrlFor } = useDashboard();
  const [smsDelivered, setSmsDelivered] = useState(false);
  const contacts = meeting.inviteeContacts ?? [];
  const calendar = meeting.source === "knowme" ? null : CALENDAR_ACCOUNTS[meeting.source];
  const hasSms = contacts.some((c) => c.phone !== null);
  useEffect(() => {
    toast.add({ title: wasEdit ? "Changes saved" : "Meeting scheduled", type: "success" });
    if (!hasSms) return undefined;
    const timer = window.setTimeout(() => setSmsDelivered(true), SMS_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [wasEdit, hasSms]);
  const url = joinUrlFor(meeting.joinCode);
  return (
    <>
      <PageHead>
        <PageHeadText>
          <MeetingsCrumbs label={meeting.title} />
          <PageTitle>{wasEdit ? "Changes saved" : "Meeting scheduled"}</PageTitle>
          <PageSub>
            {meeting.title} · {formatDate(meeting.start)} ({timeZoneLabel(meeting.tz, localTz)})
          </PageSub>
        </PageHeadText>
      </PageHead>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
        <Panel labelledBy="ok-title">
          <div className="flex items-center gap-s4">
            <span className="grid size-12 flex-none place-items-center rounded-14 bg-green-soft text-green-text">
              <KmIcon name="check" className="size-7" />
            </span>
            <div className="min-w-0">
              <h2 id="ok-title" className="text-xl">
                {wasEdit ? "Invitees are being notified" : "Invites are on their way"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Delivery status updates here and on the meeting page.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-s2 rounded-base bg-card p-s3 text-sm text-muted-foreground">
            <KmIcon
              name={calendar ? "calendar" : "info"}
              className="mt-px size-[18px] text-cyan-text"
            />
            <span>
              {calendar
                ? `Calendar event ${wasEdit ? "updated" : "created"} in ${calendar.label} — ${calendar.account}, with the KnowMe link and dial-in details.`
                : "Not added to a calendar. Invites were sent directly by email and SMS."}
            </span>
          </div>
          <h3>Per-invitee delivery</h3>
          <ul className="m-0 grid list-none p-0">
            {contacts.map((inv) => (
              <li
                key={inv.key}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s3 py-s3"
              >
                <Avatar size="sm" aria-hidden="true">
                  <AvatarFallback>{initialsOf(inv.name)}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 gap-s2">
                  <strong className="truncate text-sm" title={inv.name}>
                    {inv.name}
                  </strong>
                  <div className="grid gap-1.5">
                    {inv.email ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ChannelChip channel="email" />
                        <StatusChip status="sent" />
                        <span className="truncate text-xs text-muted-foreground">{inv.email}</span>
                      </span>
                    ) : null}
                    {inv.phone ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ChannelChip channel="sms" />
                        <StatusChip status={smsDelivered ? "delivered" : "queued"} />
                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                          {inv.phone}
                        </span>
                      </span>
                    ) : null}
                    {calendar && inv.email ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ChannelChip channel="calendar" />
                        <StatusChip status="delivered" />
                        <span className="text-xs text-muted-foreground">
                          On the calendar invite
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="sr-only" role="status" aria-live="polite">
            {smsDelivered ? "SMS invites delivered." : ""}
          </p>
          <div className="flex flex-wrap items-center gap-s2">
            <Link
              to="/dashboard"
              hash={`meeting:${meeting.id}`}
              className={cn(buttonVariants(), focusFillClass)}
            >
              <span>Open meeting details</span>
              <KmIcon name="chevron-right" className="size-4" />
            </Link>
            {wasEdit ? null : (
              <button
                type="button"
                className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
                onClick={onScheduleAnother}
              >
                <KmIcon name="plus" className="size-4" />
                <span>Schedule another</span>
              </button>
            )}
            <Link
              to="/dashboard"
              hash="upcoming"
              className={cn(buttonVariants({ variant: "ghost" }), focusFillClass)}
            >
              Back to meetings
            </Link>
          </div>
        </Panel>
        <aside className="sticky top-[calc(var(--spacing-header-h)+var(--spacing-s4))] grid gap-s4 max-bp1024:static">
          <Card role="region" aria-labelledby="ok-join">
            <h2 id="ok-join" className="text-lg">
              Join info
            </h2>
            <JoinList
              rows={[
                ["Link", url],
                ["Code", meeting.joinCode],
                ...(meeting.dialIn
                  ? [["Dial in", `${meeting.dialIn.number} · PIN ${meeting.dialIn.pin}`] as const]
                  : []),
              ]}
            />
            <CopyLinkButton url={url} title={meeting.title} />
          </Card>
        </aside>
      </div>
    </>
  );
}

/** km.css `.kv`: sub-text terms, mono values. */
export function JoinList({ rows }: { readonly rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(120px,max-content)_minmax(0,1fr)] gap-x-s5 gap-y-s2">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="pt-0.5 text-sm text-muted-foreground">{term}</dt>
          <dd className="m-0 min-w-0 font-mono text-13 [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
