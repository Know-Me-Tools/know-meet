// TJ-ARCH-MOB-001 compliant
// join.html `#invite`: who invited you, the meeting facts, how the invite
// arrived, then "Join in browser" (your name, camera and mic switches, recording
// consent) beside the other ways to join. Name is validated on blur and submit;
// an invalid submit focuses it (F6). A valid submit moves to the waiting room
// (`#waiting`), the next static state; the room itself is c11.
import { Avatar, AvatarFallback } from "@know-meet/ui/components/avatar";
import { Badge, BadgePip } from "@know-meet/ui/components/badge";
import { Button } from "@know-meet/ui/components/button";
import { Input } from "@know-meet/ui/components/input";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useRef, useState } from "react";
import { formatDay, formatMinutes, formatRelativeDay, formatTime } from "../public-shared/format";
import { describedBy, FormField } from "../public-shared/form-field";
import { DIAL_IN_NUMBERS, hostOf, meetingEnd, type MeetingStatus, type SampleMeeting } from "../public-shared/sample-meetings";
import { submitForm, useField } from "../public-shared/use-field";
import { toHash } from "../shared/use-hash-route";
import { DeviceToggle } from "./device-toggle";
import { downloadInviteIcs } from "./invite-actions";
import { JoinSide } from "./join-side";

type Via = "email" | "sms" | "calendar";

const VIA: readonly { readonly key: Via; readonly icon: KmIconName; readonly label: string }[] = [
  { key: "email", icon: "mail", label: "Email" },
  { key: "sms", icon: "sms", label: "SMS" },
  { key: "calendar", icon: "calendar", label: "Calendar" },
];

interface InviteViewProps {
  readonly meeting: SampleMeeting;
  readonly status: MeetingStatus;
  readonly now: Date;
  readonly via: string | undefined;
}

function Fact({ label, value, sub, nowrap = false }: { readonly label: string; readonly value: string; readonly sub: string; readonly nowrap?: boolean }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-base bg-card px-s4 py-s3">
      <span className="block font-mono text-11 font-semibold tracking-table text-muted-foreground uppercase">{label}</span>
      <span className={nowrap ? "block font-semibold whitespace-nowrap" : "block font-semibold [overflow-wrap:anywhere]"}>{value}</span>
      <span className="block text-sm text-muted-foreground">{sub}</span>
    </div>
  );
}

function StatusChip({ meeting, status, now }: { readonly meeting: SampleMeeting; readonly status: MeetingStatus; readonly now: Date }) {
  if (status === "live") {
    return (
      <Badge variant="green">
        <BadgePip />
        In progress now
      </Badge>
    );
  }
  const day = formatRelativeDay(meeting.start, now).replace(/^(Today|Tomorrow)$/, (word) => word.toLowerCase());
  return (
    <Badge>
      <KmIcon name="clock" />
      Starts {day} at {formatTime(meeting.start)}
    </Badge>
  );
}

export function InviteView({ meeting, status, now, via }: InviteViewProps) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const host = hostOf(meeting);
  const firstName = host.name.split(" ")[0] ?? host.name;
  const name = useField((value) => {
    if (value === "") return `Enter your name so ${firstName} knows who’s asking to join.`;
    return value.length < 2 ? "Use at least 2 characters." : "";
  });
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const current: Via = via === "sms" || via === "calendar" ? via : "email";

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitForm(formRef.current, [name.check])) return;
    void navigate({
      to: "/join",
      hash: toHash("waiting", undefined, {
        code: meeting.joinCode,
        name: name.value.trim(),
        cam: camera ? "1" : "0",
        mic: mic ? "1" : "0",
      }),
    });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
      <section
        aria-labelledby="meeting-title"
        className="grid min-w-0 gap-s5 rounded-lg bg-surface p-s6 shadow-(--shadow-card) max-bp768:px-s4 max-bp768:py-s5"
      >
        <div className="flex flex-wrap items-center gap-s3">
          <Avatar tone="cyan" aria-hidden="true">
            <AvatarFallback>{host.initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 gap-0.5">
            <strong className="block">{host.name} invited you</strong>
            <span className="block text-sm text-muted-foreground">
              {host.org === "" ? host.email || "Host" : `${host.org}${host.email === "" ? "" : ` · ${host.email}`}`}
            </span>
          </div>
          <StatusChip meeting={meeting} status={status} now={now} />
        </div>
        <h1 id="meeting-title" className="text-display leading-105 font-bold tracking-display [overflow-wrap:anywhere]">
          {meeting.title}
        </h1>
        <div className="grid grid-cols-3 gap-s2 max-bp768:grid-cols-1">
          <Fact label="When" value={formatRelativeDay(meeting.start, now)} sub={formatDay(meeting.start)} />
          <Fact
            label="Time"
            value={`${formatTime(meeting.start)} – ${formatTime(meetingEnd(meeting))}`}
            sub="Your local time"
            nowrap
          />
          <Fact label="Duration" value={formatMinutes(meeting.durationMin)} sub={`${meeting.invitees.length + 1} people invited`} />
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          Invitation sent via
          {VIA.map((channel) => (
            <Badge
              key={channel.key}
              variant={channel.key === current ? "ember" : "default"}
              aria-current={channel.key === current ? "true" : undefined}
            >
              <KmIcon name={channel.icon} />
              {channel.label}
              {channel.key === current ? <span className="sr-only"> (how you opened this)</span> : null}
            </Badge>
          ))}
          <span>— you don’t need a KnowMe account.</span>
        </p>
        <form ref={formRef} noValidate aria-label="Join in browser" onSubmit={onSubmit} className="grid gap-s4">
          <FormField id="guest-name" label="Your name" required error={name.error} hint="Shown on your video tile and in the transcript.">
            <Input
              id="guest-name"
              type="text"
              autoComplete="name"
              required
              aria-required="true"
              maxLength={80}
              placeholder="e.g. Sam Patel"
              aria-describedby={describedBy("guest-name", true)}
              {...name.inputProps}
            />
          </FormField>
          <fieldset className="m-0 grid min-w-0 gap-s2 p-0">
            <legend className="mb-1.5 p-0 text-sm font-semibold">Start with</legend>
            <div className="grid grid-cols-2 gap-s2 max-bp768:grid-cols-1">
              <DeviceToggle id="dev-cam" label="Camera" onIcon="cam" offIcon="cam-off" checked={camera} onChange={setCamera} />
              <DeviceToggle id="dev-mic" label="Microphone" onIcon="mic" offIcon="mic-off" checked={mic} onChange={setMic} />
            </div>
          </fieldset>
          <section aria-labelledby="consent-title" className="grid grid-cols-[auto_minmax(0,1fr)] gap-s3 rounded-base bg-amber-soft p-s4">
            <KmIcon name="record" className="mt-0.5 text-amber-text" />
            <div className="[&>p]:mt-1 [&>p]:text-sm">
              <h2 id="consent-title" className="text-base">
                This meeting may be recorded and transcribed
              </h2>
              <p>
                {meeting.record
                  ? `${host.name} has recording turned on. KnowMe transcribes the conversation live and may record everyone in one combined video. When the meeting ends, the transcript and a summary with action items are sent to all participants by email and SMS.`
                  : "KnowMe transcribes the conversation live, and the host can start a recording during the meeting. When the meeting ends, the transcript and a summary with action items are sent to all participants by email and SMS."}
              </p>
              <p>
                By joining, you consent to being transcribed and, if the host starts it, recorded. You’ll see a notice in
                the room when recording starts, and you can keep your camera off or join by phone instead.
              </p>
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-s2 max-bp768:*:w-full">
            <Button type="submit" className="min-h-13 px-s6 text-base">
              <KmIcon name="cam" />
              <span>Join in browser</span>
            </Button>
            <Button variant="secondary" type="button" onClick={() => setAnnouncement(downloadInviteIcs(meeting, DIAL_IN_NUMBERS))}>
              <KmIcon name="calendar" />
              <span>Add to calendar</span>
            </Button>
          </div>
        </form>
      </section>
      <JoinSide meeting={meeting} numbers={DIAL_IN_NUMBERS} announce={setAnnouncement} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
