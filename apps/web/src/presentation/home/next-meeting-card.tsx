// TJ-ARCH-MOB-001 compliant
// index.html signed-in hero card "Your next meeting": the live meeting first,
// else the soonest upcoming one, else "Nothing scheduled". Static sample data.
import { Avatar, AvatarFallback, AvatarGroup } from "@know-meet/ui/components/avatar";
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Link } from "@tanstack/react-router";
import { formatMinutes, formatRelativeDay, formatTime, initialsOf } from "../public-shared/format";
import { meetingEnd, pickNextMeeting, type SampleMeeting } from "../public-shared/sample-meetings";
import { buttonLinkClass, eyebrowClass, h3Class } from "../public-shared/ui-classes";

const cardClass = "grid max-w-[460px] gap-s3 rounded-tile bg-card px-s5 py-s4 shadow-(--shadow-card)";
const rowClass = "flex flex-wrap items-center justify-between gap-s3";

export function NextMeetingCard({ meetings, now }: { readonly meetings: readonly SampleMeeting[]; readonly now: Date }) {
  const next = pickNextMeeting(meetings, now);
  if (next === null) {
    return (
      <section aria-labelledby="next-title" className={cardClass}>
        <span className={eyebrowClass}>Your next meeting</span>
        <h3 id="next-title" className={h3Class}>
          Nothing scheduled
        </h3>
        <p className="text-sm text-muted-foreground">Schedule a meeting or connect a calendar to see it here.</p>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/dashboard" hash="schedule" className={buttonLinkClass("secondary", "sm")}>
            Schedule a meeting
          </Link>
        </div>
      </section>
    );
  }
  const { meeting, status } = next;
  const live = status === "live";
  const day = formatRelativeDay(meeting.start, now);
  const shown = meeting.invitees.slice(0, 3);
  const extra = meeting.invitees.length - shown.length;
  return (
    <section aria-labelledby="next-title" className={cardClass}>
      <div className={rowClass}>
        <span className={eyebrowClass}>Your next meeting</span>
        {live ? (
          <Badge variant="green">
            <BadgePip />
            Live now
          </Badge>
        ) : (
          <Badge>
            <KmIcon name="clock" />
            {day}
          </Badge>
        )}
      </div>
      <h3 id="next-title" title={meeting.title} className={`${h3Class} line-clamp-2 [overflow-wrap:anywhere]`}>
        {meeting.title}
      </h3>
      <p className="text-sm text-muted-foreground">
        {day} · {formatTime(meeting.start)}–{formatTime(meetingEnd(meeting))} · {formatMinutes(meeting.durationMin)} · Host{" "}
        {meeting.host}
      </p>
      <div className={rowClass}>
        <AvatarGroup role="img" aria-label={`Invitees: ${meeting.invitees.join(", ")}`}>
          {shown.map((person) => (
            <Avatar key={person} size="sm">
              <AvatarFallback>{initialsOf(person)}</AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 ? (
            <Avatar size="sm">
              <AvatarFallback>+{extra}</AvatarFallback>
            </Avatar>
          ) : null}
        </AvatarGroup>
        <div className="flex flex-wrap items-center gap-s2">
          {live ? (
            <Link to="/meet" hash={`lobby?meeting=${encodeURIComponent(meeting.id)}`} className={buttonLinkClass("default", "sm")}>
              <KmIcon name="cam" className="size-4" />
              <span>Join now</span>
            </Link>
          ) : (
            <Link to="/dashboard" hash={`meeting:${meeting.id}`} className={buttonLinkClass("secondary", "sm")}>
              Open details
            </Link>
          )}
          <Link to="/dashboard" hash="upcoming" className={buttonLinkClass("ghost", "sm")}>
            All meetings
          </Link>
        </div>
      </div>
    </section>
  );
}
