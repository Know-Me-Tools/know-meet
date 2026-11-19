// TJ-ARCH-MOB-001 compliant
// Shape local-history.md §4 (detail, 1024+ side card; stacked after the chat below
// that), §7 recording link, LH-4 focus order (recording link, then Delete meeting):
// a `surface` card with the meeting facts, a link to each recording made during the
// meeting (kept when the meeting is deleted) and "Delete meeting", which confirms
// first. Scenario contract: km-history-delete, km-history-delete-confirm.
import type { MeetingSummary } from "@know-meet/domain";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useId, useState } from "react";
import { useDeleteMeetingHistory } from "../../../app/history/hooks";
import {
  countLabel,
  dayName,
  formatDuration,
  formatTime,
  isoTime,
  messagesLabel,
} from "../application/history-format";
import { recordingHash } from "../application/history-route";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

function deleteText(messageCount: number): string {
  const tail = "A recording of this meeting, if any, stays in Recordings. This can't be undone.";
  if (messageCount === 0) return `The meeting is removed from this browser. ${tail}`;
  return `The meeting and its ${countLabel(messageCount, "chat message", "chat messages")} are removed from this browser. ${tail}`;
}

function Fact({ term, children }: { readonly term: string; readonly children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function RecordingLinks({ ids }: { readonly ids: readonly string[] }) {
  if (ids.length === 0) return null;
  return (
    <ul className="m-0 grid list-none gap-s2 p-0">
      {ids.map((id, index) => (
        <li key={id}>
          <Link
            to="/recordings"
            hash={recordingHash(id)}
            className={cn(
              "flex min-h-size-target items-center gap-s3 rounded-base bg-card px-s3 font-semibold text-foreground no-underline hover:bg-accent",
              focusFillClass,
            )}
          >
            <KmIcon name="film" className="shrink-0" />
            <span className="min-w-0 flex-1">
              {ids.length === 1
                ? "Recording saved on this device"
                : `Recording ${index + 1} saved on this device`}
            </span>
            <KmIcon name="chevron-right" className="size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MeetingFactsCard({
  meeting,
  messageCount,
  now,
  onDeleted,
}: {
  readonly meeting: MeetingSummary;
  readonly messageCount: number;
  readonly now: Date;
  readonly onDeleted: () => void;
}) {
  const headingId = useId();
  const { deleteMeeting, pending } = useDeleteMeetingHistory();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const duration = formatDuration(meeting);
  const people = meeting.participants.map((person) => person.name).filter((name) => name !== "");

  const confirm = async () => {
    setFailed(false);
    const ok = await deleteMeeting(meeting.id);
    if (!ok) {
      setFailed(true);
      return;
    }
    setDeleted(true);
    setOpen(false);
    onDeleted();
  };

  return (
    <section
      aria-labelledby={headingId}
      className="grid min-w-0 content-start gap-s4 rounded-tile bg-surface p-s5 max-bp768:p-s4 expanded:sticky expanded:top-s5"
    >
      <h2 id={headingId} className="m-0 text-lg leading-heading font-semibold">
        About this meeting
      </h2>
      <dl className="m-0 grid gap-s3">
        <Fact term="Started">
          <time dateTime={isoTime(meeting.joinedAt)}>
            {dayName(meeting.joinedAt, now)}, {formatTime(meeting.joinedAt)}
          </time>
        </Fact>
        <Fact term="Duration">{duration ?? "Unknown"}</Fact>
        <Fact term={countLabel(meeting.participants.length, "person", "people")}>
          {people.length === 0 ? "No names were seen" : people.join(", ")}
        </Fact>
        <Fact term="Chat">{messagesLabel(messageCount)}</Fact>
      </dl>
      <RecordingLinks ids={meeting.recordingIds} />
      <Button
        variant="destructive"
        data-testid="km-history-delete"
        className="w-full"
        onClick={() => {
          setFailed(false);
          setDeleted(false);
          setOpen(true);
        }}
      >
        <KmIcon name="trash" />
        <span>Delete meeting</span>
      </Button>
      <ConfirmDeleteDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title="Delete this meeting?"
        confirmLabel="Delete meeting"
        pending={pending}
        failed={failed}
        returnFocus={!deleted}
        confirmTestId="km-history-delete-confirm"
        onConfirm={() => void confirm()}
      >
        {deleteText(messageCount)}
      </ConfirmDeleteDialog>
    </section>
  );
}
