// TJ-ARCH-MOB-001 compliant
// Recording notes in the room's notices row (wc10 task 10.4; WC-8, WC-9; D2), in the
// Enable audio prompt's grammar: a note on a fill (Flat 2.0), glyph, one line of cause,
// one action. Three cases, at most one at a time:
// - the requester waits for answers: who is still asked, and "Cancel request";
// - this browser records and a late joiner is being asked: what a decline would do;
// - a one-time notice (declined, not sent, recorder failed, stopped): static text in a
//   role="status" note with "Dismiss". A decline carries the scenario contract id
//   `km-recording-request-declined`. As with the room head's connection chip, the note
//   is `aria-live="off"`: the room's one status region announces it (useRecordingUi).
// Notes sit on `surface` because they hold a button (controls only on bg, bg-2,
// surface or card); the glyph carries the tone.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import type { RoomRecordingView } from "../../../../app/recordings/hooks";
import {
  lateJoinerText,
  listNames,
  type NameOf,
  noticeText,
  RECORD_COPY,
  runningText,
  waitingText,
} from "./recording-copy";

const noteClass =
  "mx-auto flex w-[min(100%,760px)] flex-wrap items-center gap-x-s3 gap-y-s2 rounded-base px-s4 py-s3 text-foreground";

interface NoteProps extends Omit<React.ComponentProps<"div">, "children"> {
  readonly icon: KmIconName;
  readonly tone: "record" | "warn";
  readonly text: React.ReactNode;
  readonly action: React.ReactNode;
}

function Note({ icon, tone, text, action, className, ...props }: NoteProps) {
  return (
    <div className={cn(noteClass, "bg-surface", className)} {...props}>
      <KmIcon
        name={icon}
        className={cn("size-5 flex-none", tone === "warn" ? "text-amber-text" : "text-red-text")}
      />
      <div className="min-w-0 flex-1 text-sm">{text}</div>
      {action}
    </div>
  );
}

interface RecordingNoticeProps {
  readonly recording: RoomRecordingView;
  readonly nameOf: NameOf;
}

export function RecordingNotice({ recording, nameOf }: RecordingNoticeProps) {
  const { state, notice, prompt, support } = recording;

  if (prompt?.running === true) {
    return (
      <Note
        icon="record"
        tone="record"
        role="group"
        aria-label={RECORD_COPY.runningTitle}
        data-testid="km-recording-consent-prompt"
        text={
          <>
            <p className="font-semibold">{RECORD_COPY.runningTitle}</p>
            <p className="text-muted-foreground">
              {runningText(nameOf(prompt.requester), prompt.admissionBound === true)}
            </p>
          </>
        }
        action={
          <div className="flex flex-wrap gap-s2">
            <Button
              type="button"
              variant="secondary"
              data-testid="km-recording-consent-decline"
              onClick={() => recording.answer("declined")}
            >
              {RECORD_COPY.runningDecline}
            </Button>
            <Button
              type="button"
              data-testid="km-recording-consent-agree"
              onClick={() => recording.answer("agreed")}
            >
              {RECORD_COPY.runningAgree}
            </Button>
          </div>
        }
      />
    );
  }

  if (state.status === "requesting") {
    return (
      <Note
        icon="record"
        tone="record"
        text={
          <>
            <p className="font-semibold">{RECORD_COPY.askingTitle}</p>
            <p className="text-muted-foreground">
              {waitingText(listNames(state.awaiting, nameOf))} {RECORD_COPY.askingText}
            </p>
          </>
        }
        action={
          <Button type="button" variant="secondary" onClick={recording.withdraw}>
            {RECORD_COPY.cancelRequest}
          </Button>
        }
      />
    );
  }

  if (state.status === "local-recording" && state.pending.length > 0) {
    return (
      <Note
        icon="users"
        tone="record"
        text={<p>{lateJoinerText(listNames(state.pending, nameOf))}</p>}
        action={null}
      />
    );
  }

  if (notice === null) {
    return support === "unsupported" && state.status === "idle" ? (
      <Note icon="alert" tone="warn" text={<p>{RECORD_COPY.unsupported}</p>} action={null} />
    ) : null;
  }
  const declined = notice.kind === "declined";
  return (
    <Note
      role="status"
      aria-live="off"
      icon={declined ? "x" : "alert"}
      tone="warn"
      data-testid={declined ? "km-recording-request-declined" : undefined}
      text={<p>{noticeText(notice, nameOf)}</p>}
      action={
        <Button type="button" variant="secondary" onClick={recording.dismissNotice}>
          {RECORD_COPY.dismiss}
        </Button>
      }
    />
  );
}
