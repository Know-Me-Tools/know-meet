// TJ-ARCH-MOB-001 compliant
// dashboard.html `#upcoming`: page head, section tabs, the live banner, the
// filterable day-grouped meeting list and the side cards (calendars, delivery).
import { buttonVariants } from "@know-meet/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@know-meet/ui/components/empty";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageActions, PageHead, PageHeadText, PageSub, PageTitle } from "@know-meet/ui/components/page-head";
import { ToggleGroup, ToggleGroupItem } from "@know-meet/ui/components/toggle-group";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDocumentTitle } from "../../shared/use-document-title";
import { formatDay, formatRelativeDay } from "../../workspace/application/format";
import { timeZoneLabel } from "../application/dashboard-fixtures";
import { statusOf } from "../application/dashboard-state";
import { type DashboardMeeting, MEETING_FILTERS, type MeetingFilter } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { DashTabs } from "./dashboard-parts";
import { LiveBanner, MeetingRow } from "./meeting-row";
import { CalendarsCard, DeliveryCard } from "./side-cards";

const FILTER_EMPTY: Readonly<Record<MeetingFilter, { title: string; body: string }>> = {
  all: { title: "Nothing else on the calendar", body: "Schedule a meeting and invite people by email or phone number." },
  hosting: { title: "No upcoming meetings you’re hosting", body: "Try a different filter, or schedule a new meeting." },
  invited: { title: "No upcoming meetings you’re invited to", body: "Try a different filter, or schedule a new meeting." },
};

function isFilter(value: unknown): value is MeetingFilter {
  return MEETING_FILTERS.some((f) => f.key === value);
}

interface DayGroup {
  readonly label: string;
  readonly items: readonly DashboardMeeting[];
}

function groupByDay(rows: readonly DashboardMeeting[], now: Date): readonly DayGroup[] {
  const groups: { label: string; items: DashboardMeeting[] }[] = [];
  for (const meeting of rows) {
    const label = formatRelativeDay(meeting.start, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(meeting);
    else groups.push({ label, items: [meeting] });
  }
  return groups;
}

function MeetingList({ rows, filter, onShowAll }: { readonly rows: readonly DashboardMeeting[]; readonly filter: MeetingFilter; readonly onShowAll: () => void }) {
  const { now } = useDashboard();
  if (rows.length === 0) {
    const copy = FILTER_EMPTY[filter];
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KmIcon name="calendar" />
          </EmptyMedia>
          <EmptyTitle>{copy.title}</EmptyTitle>
          <EmptyDescription>{copy.body}</EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/dashboard" hash="schedule" className={cn(buttonVariants({ size: "sm" }), focusFillClass)}>
            <KmIcon name="plus" className="size-4" />
            <span>Schedule meeting</span>
          </Link>
          {filter === "all" ? null : (
            <button type="button" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), focusFillClass)} onClick={onShowAll}>
              Show all
            </button>
          )}
        </div>
      </Empty>
    );
  }
  return groupByDay(rows, now).map((group, index) => {
    const first = group.items[0];
    const headingId = `day-${index}`;
    return (
      <section key={group.label} aria-labelledby={headingId} className="grid gap-s2 not-first:mt-s5">
        <h2 id={headingId} className="font-mono text-xs font-semibold tracking-table text-muted-foreground uppercase">
          {group.label}
          {(group.label === "Today" || group.label === "Tomorrow") && first ? (
            <span className="ml-s2 font-body text-sm tracking-none whitespace-nowrap normal-case">{formatDay(first.start)}</span>
          ) : null}
        </h2>
        <ul className="m-0 grid list-none gap-s2 p-0">
          {group.items.map((meeting) => (
            <li key={meeting.id}>
              <MeetingRow meeting={meeting} />
            </li>
          ))}
        </ul>
      </section>
    );
  });
}

export function UpcomingView({ initialFilter }: { readonly initialFilter: string | undefined }) {
  useDocumentTitle("Meetings · Know Meet");
  const { meetings, now, workspace, localTz } = useDashboard();
  const [filter, setFilter] = useState<MeetingFilter>(isFilter(initialFilter) ? initialFilter : "all");
  const active = meetings.filter((m) => {
    const status = statusOf(m, now);
    return status === "live" || status === "upcoming";
  });
  const live = active.find((m) => statusOf(m, now) === "live") ?? null;
  const hosting = (m: DashboardMeeting) => m.host === workspace.user.name;
  const rows = active
    .filter((m) => m !== live)
    .filter((m) => (filter === "hosting" ? hosting(m) : filter === "invited" ? !hosting(m) : true));

  const choose = (next: MeetingFilter) => {
    setFilter(next);
    window.history.replaceState(window.history.state, "", `#upcoming${next === "all" ? "" : `?filter=${next}`}`);
  };

  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageTitle>Meetings</PageTitle>
          <PageSub>Everything on your connected calendars, plus meetings scheduled in KnowMe.</PageSub>
        </PageHeadText>
        <PageActions>
          <Link to="/meet" hash="start" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
            <KmIcon name="cam" />
            <span>Start now</span>
          </Link>
          <Link to="/dashboard" hash="schedule" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="plus" />
            <span>Schedule meeting</span>
          </Link>
        </PageActions>
      </PageHead>
      <DashTabs active="upcoming" />
      {live ? <LiveBanner meeting={live} /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-s4 flex flex-wrap items-center justify-between gap-s3">
            <h2 className="sr-only">Upcoming meetings</h2>
            <ToggleGroup
              aria-label="Filter meetings"
              value={[filter]}
              onValueChange={(value) => {
                const next = value[0];
                if (isFilter(next)) choose(next);
              }}
            >
              {MEETING_FILTERS.map((f) => (
                <ToggleGroupItem key={f.key} value={f.key}>
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-sm text-muted-foreground">Times shown in {timeZoneLabel(localTz, localTz)}</span>
          </div>
          <div aria-live="polite">
            <MeetingList rows={rows} filter={filter} onShowAll={() => choose("all")} />
          </div>
        </div>
        <aside aria-label="Calendars and delivery" className="grid content-start gap-s4">
          <CalendarsCard />
          <DeliveryCard />
        </aside>
      </div>
    </>
  );
}
