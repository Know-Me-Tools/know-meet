// TJ-ARCH-MOB-001 compliant
// dashboard.html `#meeting:<id>`: detail head (crumbs, title, status and time
// meta, description, actions) and the detail grid. Cancelling asks first in an
// alert dialog that says exactly who is told and what stops working.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@know-meet/ui/components/alert-dialog";
import { Button, buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageTitle } from "@know-meet/ui/components/page-head";
import { toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useDocumentTitle } from "../../shared/use-document-title";
import { formatDay, formatTime } from "../../workspace/application/format";
import { timeZoneLabel } from "../application/dashboard-fixtures";
import { meetingEndOf, statusOf } from "../application/dashboard-state";
import type { DashboardMeeting } from "../domain/dashboard";
import { useDashboard } from "./dashboard-context";
import { CopyLinkButton, MeetingStatusChip, MeetingsCrumbs, SourceChip } from "./dashboard-parts";
import { AgentsCard, JoinInfoCard, PreReadsCard, RecordingCard } from "./meeting-cards";
import { InviteesCard } from "./meeting-invitees-card";
import { NotFoundView } from "./not-found-view";

function CancelMeetingButton({ meeting }: { readonly meeting: DashboardMeeting }) {
  const { dispatch } = useDashboard();
  const navigate = useNavigate();
  const title = meeting.title.length > 60 ? `${meeting.title.slice(0, 57)}…` : meeting.title;
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        <KmIcon name="trash" />
        <span>Cancel meeting</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            All {meeting.invitees.length} invitees are told by email and SMS, and the calendar event
            is removed. The join link stops working. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep meeting</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              dispatch({ type: "cancel", id: meeting.id });
              toast.add({ title: "Meeting cancelled — invitees notified", type: "success" });
              void navigate({ to: "/dashboard", hash: "upcoming" });
            }}
          >
            Cancel meeting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MeetingView({ id }: { readonly id: string | null }) {
  const { getMeeting, now, localTz, workspace, joinUrlFor } = useDashboard();
  const meeting = id === null ? null : getMeeting(id);
  useDocumentTitle(meeting ? `${meeting.title} · Know Meet` : "Meeting not found · Know Meet");
  if (meeting === null) return <NotFoundView id={id} />;

  const status = statusOf(meeting, now);
  const start = new Date(meeting.start);
  const canChange = status === "upcoming";
  const hosting = meeting.host === workspace.user.name;
  return (
    <>
      <header className="mb-s5 grid gap-s3">
        <MeetingsCrumbs label={meeting.title} />
        <PageTitle className="[overflow-wrap:anywhere]">{meeting.title}</PageTitle>
        <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2 text-sm text-muted-foreground">
          <MeetingStatusChip status={status} />
          <span className="whitespace-nowrap">{formatDay(start)}</span>
          <span className="whitespace-nowrap">
            {formatTime(start)} – {formatTime(meetingEndOf(meeting))}
          </span>
          <span>{timeZoneLabel(meeting.tz, localTz)}</span>
          <SourceChip source={meeting.source} />
          <span>Host: {hosting ? "You" : meeting.host}</span>
        </div>
        {meeting.description ? (
          <p className="max-w-[68ch] text-muted-foreground">{meeting.description}</p>
        ) : null}
        {meeting.cancelled ? (
          <p className="flex items-center gap-s2 rounded-base bg-red-soft px-s4 py-s3 font-medium text-foreground">
            <KmIcon name="alert" className="text-red-text" />
            <span>
              This meeting was cancelled. Invitees were notified and the join link no longer works.
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-s2">
          {status === "live" || status === "upcoming" ? (
            <Link to="/meet" hash="lobby" className={cn(buttonVariants(), focusFillClass)}>
              <KmIcon name="cam" />
              <span>Join</span>
            </Link>
          ) : null}
          {meeting.cancelled ? null : (
            <CopyLinkButton
              url={joinUrlFor(meeting.joinCode)}
              title={meeting.title}
              size="default"
            />
          )}
          {canChange ? (
            <>
              <Link
                to="/dashboard"
                hash={`schedule?edit=${encodeURIComponent(meeting.id)}`}
                className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}
              >
                <KmIcon name="edit" />
                <span>Edit</span>
              </Link>
              <CancelMeetingButton meeting={meeting} />
            </>
          ) : null}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-s4 max-bp900:grid-cols-[minmax(0,1fr)]">
        <JoinInfoCard meeting={meeting} />
        <RecordingCard meeting={meeting} editable={canChange || status === "live"} />
        <InviteesCard meeting={meeting} />
        <AgentsCard meeting={meeting} editable={canChange} />
        <PreReadsCard meeting={meeting} editable={!meeting.cancelled && status !== "ended"} />
      </div>
    </>
  );
}
