// TJ-ARCH-MOB-001 compliant
// dashboard.html `liveBanner` and `meetingRow`: the ember-soft banner for the
// meeting in progress, and one row per upcoming meeting (time, title link, chips
// and meta, then Join / Copy link / Details).
import { buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageEyebrow } from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { formatMinutes, formatTime } from "../../workspace/application/format";
import type { Agent } from "../../workspace/domain/workspace";
import type { DashboardMeeting } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { AgentChips, AvatarStack, CopyLinkButton, MetaItem, SourceChip } from "./dashboard-parts";
import { LivePip } from "./live-pip";

const MINUTE_MS = 60_000;

export function LiveBanner({ meeting }: { readonly meeting: DashboardMeeting }) {
  const { now } = useDashboard();
  const minutes = Math.max(
    1,
    Math.round((now.getTime() - new Date(meeting.start).getTime()) / MINUTE_MS),
  );
  return (
    <section
      aria-labelledby="live-title"
      className="mb-s5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s4 rounded-tile bg-ember-soft px-s5 py-s4 text-foreground max-bp768:grid-cols-[auto_minmax(0,1fr)]"
    >
      <LivePip />
      <div className="flex min-w-0 flex-col gap-0.5">
        <PageEyebrow>Live now</PageEyebrow>
        <h2 id="live-title" title={meeting.title} className="truncate text-lg">
          {meeting.title}
        </h2>
        <span className="text-sm text-muted-foreground">
          Started {minutes} min ago · {meeting.invitees.length} invitees
          {meeting.record ? " · Recording on" : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-s2 max-bp768:col-span-full">
        <Link
          to="/dashboard"
          hash={`meeting:${meeting.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), focusFillClass)}
        >
          <span>Details</span>
        </Link>
        <Link to="/meet" hash="lobby" className={cn(buttonVariants(), focusFillClass)}>
          <KmIcon name="cam" />
          <span>Join</span>
        </Link>
      </div>
    </section>
  );
}

export function MeetingRow({ meeting }: { readonly meeting: DashboardMeeting }) {
  const { workspace, joinUrlFor } = useDashboard();
  const start = new Date(meeting.start);
  const agents = meeting.agents
    .map((id) => workspace.agents.find((a) => a.id === id))
    .filter((a): a is Agent => a !== undefined);
  const hosting = meeting.host === workspace.user.name;
  return (
    <article
      aria-label={`${meeting.title}, ${formatTime(start)}`}
      className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-s4 rounded-base bg-surface p-s4 shadow-(--shadow-card) max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:gap-s3"
    >
      <div className="grid gap-0.5 max-bp768:flex max-bp768:items-baseline max-bp768:gap-s2">
        <strong className="font-display text-base font-semibold whitespace-nowrap">
          {formatTime(start)}
        </strong>
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {formatMinutes(meeting.durationMin)}
        </span>
      </div>
      <div className="grid min-w-0 gap-s2">
        <Link
          to="/dashboard"
          hash={`meeting:${meeting.id}`}
          title={meeting.title}
          className="block truncate font-semibold text-foreground no-underline hover:underline"
        >
          {meeting.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2 *:min-w-0">
          <SourceChip source={meeting.source} />
          <AvatarStack names={meeting.invitees} />
          {meeting.record ? <MetaItem icon="record">Recording on</MetaItem> : null}
          {meeting.dialIn ? <MetaItem icon="phone-in">Dial-in</MetaItem> : null}
          {hosting ? null : <MetaItem icon="user">Host: {meeting.host}</MetaItem>}
          <AgentChips agents={agents} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-s2 max-bp768:justify-start">
        <Link
          to="/meet"
          hash="lobby"
          aria-label={`Join ${meeting.title}`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)}
        >
          <KmIcon name="cam" className="size-4" />
          <span>Join</span>
        </Link>
        <CopyLinkButton url={joinUrlFor(meeting.joinCode)} title={meeting.title} />
        <Link
          to="/dashboard"
          hash={`meeting:${meeting.id}`}
          aria-label={`Open details for ${meeting.title}`}
          title="Details"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), focusFillClass)}
        >
          <KmIcon name="chevron-right" />
        </Link>
      </div>
    </article>
  );
}
