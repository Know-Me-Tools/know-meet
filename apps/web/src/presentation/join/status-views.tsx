// TJ-ARCH-MOB-001 compliant
// join.html `#waiting`, `#expired` and `#wrong-code`, each a centred card.
// Waiting: a filled pulse (no ring stroke, D-6) around the guest's orb, a polite
// status line, device chips and "Leave waiting room" behind a confirmation.
// Admission is not simulated here (static screen); the room is c11.
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@know-meet/ui/components/alert-dialog";
import { Badge } from "@know-meet/ui/components/badge";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { Separator } from "@know-meet/ui/components/separator";
import { Link, useNavigate } from "@tanstack/react-router";
import { formatDate } from "../public-shared/format";
import { hostOf, SAMPLE_PEOPLE, type SampleMeeting } from "../public-shared/sample-meetings";
import { eyebrowClass, h1Class } from "../public-shared/ui-classes";
import { toHash } from "../shared/use-hash-route";
import { CenterCard, OptionItem, OptionList, StateBadge } from "./center-card";
import { CodeForm } from "./code-form";
import { InlineCode } from "./join-side";

interface WaitingViewProps {
  readonly meeting: SampleMeeting;
  readonly guestName: string;
  readonly camera: boolean;
  readonly mic: boolean;
}

export function WaitingView({ meeting, guestName, camera, mic }: WaitingViewProps) {
  const navigate = useNavigate();
  const host = hostOf(meeting);
  return (
    <CenterCard labelledBy="wait-title">
      <div aria-hidden="true" className="relative grid size-30 place-items-center">
        <span className="absolute inset-0 rounded-round bg-ember-soft opacity-0 animate-wait-ring motion-reduce:animate-none motion-reduce:opacity-35" />
        <span className="absolute inset-0 rounded-round bg-ember-soft opacity-0 animate-wait-ring [animation-delay:calc(var(--anim-wait-ring)/2)] motion-reduce:hidden" />
        <Orb tone="cyan" className="w-16" />
      </div>
      <span className={eyebrowClass}>Waiting room</span>
      <h1 id="wait-title" className={h1Class}>
        The host will let you in soon
      </h1>
      <p>
        You’re asking to join <strong>{meeting.title}</strong> as{" "}
        <strong>{guestName}</strong>. {host.name} has been notified. Keep this page open.
      </p>
      <p role="status" className="inline-flex items-center gap-s2 font-semibold">
        <span>Waiting for {host.name} to let you in…</span>
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        <Badge>
          <KmIcon name={camera ? "cam" : "cam-off"} />
          {camera ? "Camera on" : "Camera off"}
        </Badge>
        <Badge>
          <KmIcon name={mic ? "mic" : "mic-off"} />
          {mic ? "Mic on" : "Mic off"}
        </Badge>
      </div>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="secondary" type="button" />}>
          <KmIcon name="leave" />
          <span>Leave waiting room</span>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the waiting room?</AlertDialogTitle>
            <AlertDialogDescription>
              {host.name} won’t see you waiting any more. You can come back any time from your invite link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep waiting</AlertDialogCancel>
            <Button
              variant="destructive"
              type="button"
              onClick={() => void navigate({ to: "/join", hash: toHash("invite", undefined, { code: meeting.joinCode }) })}
            >
              Leave
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CenterCard>
  );
}

interface ExpiredViewProps {
  readonly meeting: SampleMeeting | null;
  readonly meetings: readonly SampleMeeting[];
}

export function ExpiredView({ meeting, meetings }: ExpiredViewProps) {
  const host = meeting === null ? (SAMPLE_PEOPLE[0] ?? null) : hostOf(meeting);
  const hostFirst = host === null ? "" : (host.name.split(" ")[0] ?? host.name);
  const subject = `New link for ${meeting === null ? "our KnowMe meeting" : meeting.title}`;
  const body = `Hi ${hostFirst}, my Know Meet link has expired. Could you send a new one?`;
  const mail =
    host === null || host.email === ""
      ? null
      : `mailto:${host.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <CenterCard labelledBy="exp-title">
      <StateBadge icon="clock" tone="warn" />
      <h1 id="exp-title" className={h1Class}>
        This meeting has ended
      </h1>
      <p>
        {meeting === null
          ? "This invite link has expired. The meeting has ended or the host closed the link."
          : `The link for “${meeting.title}” on ${formatDate(meeting.start)} is no longer active. The meeting has ended or the host closed the link.`}
      </p>
      <OptionList>
        <OptionItem
          icon="mail"
          title={`Ask ${host === null ? "the host" : host.name} for a new link`}
          detail="If the meeting was rescheduled, the host can send a fresh invite by email, SMS or calendar."
          {...(mail === null ? {} : { action: <a href={mail}>Email {hostFirst}</a> })}
        />
        <OptionItem
          icon="send"
          title="Watch for the summary"
          detail="If you took part, the transcript and summary arrive by email or SMS shortly after the meeting ends."
        />
        <OptionItem
          icon="cam"
          title="Start your own meeting"
          detail="No account needed — you’ll get the Concierge and live transcription."
          action={
            <Link to="/meet" hash="start">
              Start a meeting
            </Link>
          }
        />
      </OptionList>
      <Separator className="my-s4" />
      <h2 className="justify-self-start text-base">Have a different code?</h2>
      <CodeForm idSuffix="expired" meetings={meetings} />
    </CenterCard>
  );
}

export function WrongCodeView({ tried, meetings }: { readonly tried: string; readonly meetings: readonly SampleMeeting[] }) {
  return (
    <CenterCard labelledBy="wc-title">
      <StateBadge icon="search" tone="error" />
      <h1 id="wc-title" className={h1Class}>
        We couldn’t find that meeting
      </h1>
      {tried === "" ? (
        <p>Enter the meeting code from your invite to find the meeting.</p>
      ) : (
        <p>
          No meeting uses the code <InlineCode>{tried}</InlineCode>. Check it against your invite and try again.
        </p>
      )}
      <CodeForm idSuffix="retry" meetings={meetings} initialCode={tried} focusOnMount={tried !== ""} />
      <OptionList>
        <OptionItem
          icon="info"
          title="Where to find the code"
          detail="It’s in the invite email, the SMS, or the calendar event description — or just open the link in the invite."
        />
        <OptionItem
          icon="cam"
          title="Start your own meeting instead"
          action={
            <Link to="/meet" hash="start">
              Start a meeting
            </Link>
          }
        />
      </OptionList>
    </CenterCard>
  );
}
