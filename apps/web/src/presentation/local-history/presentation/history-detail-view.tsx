// TJ-ARCH-MOB-001 compliant
// /history#meeting:<id> (shape local-history.md §2, §4, §6, LH-1, LH-4): the
// "History" back link, the meeting title as the `h1` with date, time, duration and
// people, then the received chat and the facts card (two columns from the expanded
// width, one column up to 720px below it). The same `h1` element stays mounted
// through loading, "Meeting not found" and read errors, so focus moved to it on a
// hash change is not lost when the read finishes. The id was parsed by the route;
// it is never put in a request (WC-7).
import type { MeetingHistoryId, MeetingSummary } from "@know-meet/domain";
import { buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageHead, PageHeadText, PageSub, PageTitle } from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useMeetingHistoryDetail } from "../../../app/history/hooks";
import { useDocumentTitle } from "../../shared/use-document-title";
import {
  dayName,
  formatDuration,
  formatTime,
  meetingTitle,
  peopleLabel,
} from "../application/history-format";
import { HistoryChat } from "./history-chat";
import { HistoryReadError, HistorySkeleton, StorageBlockedNote } from "./history-list-states";
import { MeetingFactsCard } from "./meeting-facts-card";
import { useDelayedFlag } from "./use-delayed-flag";

const NOT_FOUND_TITLE = "Meeting not found";

function BackLink() {
  return (
    <Link
      to="/history"
      className={cn(
        "mb-s3 inline-flex min-h-size-target items-center gap-s2 justify-self-start rounded-base px-s2 font-semibold text-foreground no-underline hover:bg-accent",
        focusFillClass,
      )}
    >
      <KmIcon name="chevron-right" className="size-4 rotate-180" />
      <span>History</span>
    </Link>
  );
}

function NotFoundBody() {
  return (
    <div className="grid justify-items-start gap-s4">
      <p className="m-0 max-w-[72ch] text-muted-foreground">
        This meeting isn't in this browser's history. It may have been deleted.
      </p>
      <Link to="/history" className={cn(buttonVariants(), focusFillClass)}>
        <KmIcon name="clock" />
        <span>Back to History</span>
      </Link>
    </div>
  );
}

function meetingSub(meeting: MeetingSummary, now: Date): string {
  const parts = [`${dayName(meeting.joinedAt, now)}, ${formatTime(meeting.joinedAt)}`];
  const duration = formatDuration(meeting);
  if (duration !== null) parts.push(duration);
  parts.push(peopleLabel(meeting));
  return parts.join(" · ");
}

interface DetailFrameProps {
  readonly title: string;
  readonly sub: string | null;
  readonly children: React.ReactNode;
}

function DetailFrame({ title, sub, children }: DetailFrameProps) {
  useDocumentTitle(`${title} — History — Know Meet`);
  return (
    <div className="grid min-w-0">
      <BackLink />
      <PageHead>
        <PageHeadText>
          <PageTitle className="[overflow-wrap:anywhere]">{title}</PageTitle>
          {sub === null ? null : <PageSub>{sub}</PageSub>}
        </PageHeadText>
      </PageHead>
      {children}
    </div>
  );
}

export function NotFoundDetailView() {
  return (
    <DetailFrame title={NOT_FOUND_TITLE} sub={null}>
      <NotFoundBody />
    </DetailFrame>
  );
}

export function HistoryDetailView({
  id,
  storageBlocked,
  onDeleted,
}: {
  readonly id: MeetingHistoryId;
  readonly storageBlocked: boolean;
  readonly onDeleted: (id: MeetingHistoryId) => void;
}) {
  const detail = useMeetingHistoryDetail(storageBlocked ? null : id);
  const showSkeleton = useDelayedFlag(detail.loading);
  const now = new Date();

  if (storageBlocked) {
    return (
      <DetailFrame title="History unavailable" sub={null}>
        <StorageBlockedNote />
      </DetailFrame>
    );
  }
  if (detail.error !== null) {
    return (
      <DetailFrame title="Meeting couldn't be read" sub={null}>
        <HistoryReadError title="This meeting couldn't be read" onRetry={detail.reload} />
      </DetailFrame>
    );
  }
  if (detail.notFound) {
    return (
      <DetailFrame title={NOT_FOUND_TITLE} sub={null}>
        <NotFoundBody />
      </DetailFrame>
    );
  }
  const meeting = detail.meeting;
  if (meeting === null) {
    return (
      <DetailFrame title="Loading meeting" sub={null}>
        <HistorySkeleton visible={showSkeleton} />
      </DetailFrame>
    );
  }
  return (
    <DetailFrame title={meetingTitle(meeting)} sub={meetingSub(meeting, now)}>
      <div className="grid min-w-0 max-w-[720px] gap-s6 expanded:max-w-none expanded:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] expanded:items-start">
        <HistoryChat chat={detail.chat} meeting={meeting} />
        <MeetingFactsCard
          meeting={meeting}
          messageCount={detail.chat.length}
          now={now}
          onDeleted={() => onDeleted(meeting.id)}
        />
      </div>
    </DetailFrame>
  );
}
