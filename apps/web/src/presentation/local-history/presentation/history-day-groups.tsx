// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §4, §8, LH-1, LH-3, LH-10: meetings grouped by day under
// `h2` eyebrows, each meeting one `list-row` link (no nested controls) in a `ul`.
// The link's name carries title, day and time ("Design sync, today 14:30"); the
// visible time is a `<time datetime>`. From the medium width the message count and
// a "Recording" marker move into trailing chips. Focus is the kit fill with the
// inner fills dropped. Scenario contract: km-history-entry (data-history-id),
// km-history-entry-date, km-history-entry-open.
import type { MeetingSummary } from "@know-meet/domain";
import { Badge } from "@know-meet/ui/components/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@know-meet/ui/components/item";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import {
  type DayGroup,
  formatTime,
  inlineDay,
  isoTime,
  meetingTitle,
  messagesLabel,
  rowMetaParts,
} from "../application/history-format";
import { meetingHash } from "../application/history-route";

/** Inner fills (lead tile, chips) give way to the row's focus fill. */
const dropFillOnFocus = "group-focus-visible/item:bg-transparent";

function HistoryRow({ meeting, now }: { readonly meeting: MeetingSummary; readonly now: Date }) {
  const parts = rowMetaParts(meeting);
  const hasRecording = meeting.recordingIds.length > 0;
  return (
    <li data-testid="km-history-entry" data-history-id={meeting.id} className="min-w-0">
      <Item
        render={<Link to="/history" hash={meetingHash(meeting.id)} />}
        data-testid="km-history-entry-open"
        className="min-h-16 flex-nowrap"
      >
        <ItemMedia variant="icon" className={dropFillOnFocus}>
          <KmIcon name="calendar" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="block w-full truncate">
            {meetingTitle(meeting)}
            <span className="sr-only">, </span>
          </ItemTitle>
          <ItemDescription>
            <time data-testid="km-history-entry-date" dateTime={isoTime(meeting.joinedAt)}>
              <span className="sr-only">{inlineDay(meeting.joinedAt, now)} </span>
              {formatTime(meeting.joinedAt)}
            </time>
            {parts.map((part) => (
              <span key={part.text} className={cn(part.chipFromMedium && "medium:hidden")}>
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                {part.text}
              </span>
            ))}
            {hasRecording ? (
              <span className="medium:hidden">
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                recording saved
              </span>
            ) : null}
          </ItemDescription>
        </ItemContent>
        <span className="flex shrink-0 items-center gap-s2">
          <Badge className={cn("max-medium:hidden", dropFillOnFocus)}>
            <span className="sr-only">, </span>
            {messagesLabel(meeting.messageCount)}
          </Badge>
          {hasRecording ? (
            <Badge className={cn("max-medium:hidden", dropFillOnFocus)}>
              <KmIcon name="film" />
              <span className="sr-only">, </span>
              Recording
            </Badge>
          ) : null}
          <KmIcon name="chevron-right" className="size-4 text-muted-foreground" />
        </span>
      </Item>
    </li>
  );
}

function HistoryDayGroup({ group, now }: { readonly group: DayGroup; readonly now: Date }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-s3">
      <h2
        id={headingId}
        className="m-0 font-mono text-sm font-semibold tracking-eyebrow text-muted-foreground uppercase"
      >
        {group.label}
      </h2>
      <ul className="m-0 grid min-w-0 list-none gap-s2 p-0">
        {group.meetings.map((meeting) => (
          <HistoryRow key={meeting.id} meeting={meeting} now={now} />
        ))}
      </ul>
    </section>
  );
}

export function HistoryDayGroups({
  groups,
  now,
}: {
  readonly groups: readonly DayGroup[];
  readonly now: Date;
}) {
  return (
    <div className="grid min-w-0 gap-s6">
      {groups.map((group) => (
        <HistoryDayGroup key={group.key} group={group} now={now} />
      ))}
    </div>
  );
}
