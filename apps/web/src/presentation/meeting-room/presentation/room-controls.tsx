// TJ-ARCH-MOB-001 compliant
// meet.html `nav.controls` (km.css `.ctl`): clock, then media toggles, then panels
// and Leave. Labels show under the icon from 900px; below that the label is
// visually hidden (still the accessible name) and buttons shrink to 48px; under
// 768px the bar scrolls sideways in one row. Mic, camera and captions toggle local
// state (no media is captured). Share, record, chat, transcript, knowledge,
// invite, add agent and the private agent open panels that are out of scope this
// phase (D-2): they stay for layout fidelity and, when pressed, say so in a toast;
// each carries the same accessible description.
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useState } from "react";
import { formatDuration } from "../../workspace/application/format";
import type { RoomMode } from "../domain/room";

export const LATER_NOTE_ID = "room-later-note";

const ctlClass = cn(
  "relative grid min-h-14 min-w-16 flex-none content-center justify-items-center gap-0.5 rounded-base bg-card px-2 py-1.5 text-foreground shadow-(--shadow-card) transition-colors duration-(--dur-fast) ease-standard",
  "[@media(hover:hover)]:hover:bg-card-hov max-bp1024:min-w-[54px] max-bp900:min-h-12 max-bp900:min-w-12 max-bp900:px-3 max-bp900:py-0",
  focusFillClass,
);

const labelClass =
  "block text-xs font-semibold whitespace-nowrap max-bp900:absolute max-bp900:size-px max-bp900:overflow-hidden max-bp900:[clip:rect(0_0_0_0)]";

type CtlTone = "rest" | "panel-on" | "off" | "leave";

const toneClass: Readonly<Record<CtlTone, string>> = {
  rest: "",
  "panel-on": "bg-ember-soft text-ember-text",
  off: "bg-red-soft [@media(hover:hover)]:hover:bg-red-soft [@media(hover:hover)]:hover:brightness-[1.12]",
  leave: "bg-danger-btn text-on-danger [@media(hover:hover)]:hover:bg-danger-btn-hov",
};

interface CtlProps extends Omit<React.ComponentProps<"button">, "children"> {
  readonly icon: KmIconName;
  readonly label: string;
  readonly tone?: CtlTone;
  readonly locked?: boolean;
}

function Ctl({ icon, label, tone = "rest", locked = false, className, ...props }: CtlProps) {
  return (
    <button type="button" className={cn(ctlClass, toneClass[tone], className)} {...props}>
      <KmIcon name={icon} />
      <span className={labelClass}>{label}</span>
      {locked ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1.5 grid size-5 place-items-center rounded-round bg-muted text-muted-foreground in-focus-visible:bg-transparent in-focus-visible:text-current"
        >
          <KmIcon name="lock" className="size-3" />
        </span>
      ) : null}
    </button>
  );
}

function CtlGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-wrap items-center gap-s2 max-bp768:flex-nowrap", className)} {...props} />
  );
}

/** meet.html `.clock` (role timer): time since you joined, mm:ss. */
function RoomClock({ startedAt }: { readonly startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span role="timer" aria-label="Time in meeting" className="font-mono text-13 text-muted-foreground">
      {formatDuration(now - startedAt)}
    </span>
  );
}

export interface RoomControlsProps {
  readonly mode: RoomMode;
  readonly startedAt: number;
  readonly micOn: boolean;
  readonly cameraOn: boolean;
  readonly captionsOn: boolean;
  readonly onToggleMic: () => void;
  readonly onToggleCamera: () => void;
  readonly onToggleCaptions: () => void;
  readonly onUnavailable: (what: string) => void;
}

export function RoomControls(props: RoomControlsProps) {
  const { mode, micOn, cameraOn, captionsOn, onUnavailable } = props;
  const guest = mode === "guest";
  const later = (what: string) => () => onUnavailable(what);
  return (
    <nav
      aria-label="Meeting controls"
      className="flex flex-wrap items-center justify-between gap-s3 px-s5 pt-s3 pb-s4 max-bp900:justify-center max-bp768:flex-nowrap max-bp768:justify-start max-bp768:gap-s2 max-bp768:overflow-x-auto max-bp768:px-s3 max-bp768:pt-s2 max-bp768:pb-s3 max-bp768:[scrollbar-width:none]"
    >
      <span id={LATER_NOTE_ID} hidden>
        Opens in a later release.
      </span>
      <CtlGroup className="max-bp900:hidden">
        <RoomClock startedAt={props.startedAt} />
      </CtlGroup>
      <CtlGroup>
        <Ctl
          icon={micOn ? "mic" : "mic-off"}
          label={micOn ? "Mute" : "Unmute"}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={micOn}
          tone={micOn ? "rest" : "off"}
          onClick={props.onToggleMic}
        />
        <Ctl
          icon={cameraOn ? "cam" : "cam-off"}
          label={cameraOn ? "Stop video" : "Start video"}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          aria-pressed={cameraOn}
          tone={cameraOn ? "rest" : "off"}
          onClick={props.onToggleCamera}
        />
        <Ctl
          icon="screen"
          label="Share"
          aria-label="Share your screen"
          aria-describedby={LATER_NOTE_ID}
          onClick={later("Screen sharing")}
        />
        <Ctl
          icon="cc"
          label="Captions"
          aria-label={captionsOn ? "Hide captions" : "Show captions"}
          aria-pressed={captionsOn}
          tone={captionsOn ? "panel-on" : "rest"}
          onClick={props.onToggleCaptions}
        />
        <Ctl
          icon="record"
          label="Record"
          aria-label={guest ? "Record (sign in to unlock)" : "Start recording"}
          aria-describedby={LATER_NOTE_ID}
          locked={guest}
          onClick={later("Recording")}
        />
      </CtlGroup>
      <CtlGroup>
        <Ctl icon="chat" label="Chat" aria-describedby={LATER_NOTE_ID} onClick={later("Meeting chat")} />
        <Ctl icon="wave" label="Transcript" aria-describedby={LATER_NOTE_ID} onClick={later("The live transcript")} />
        <Ctl icon="book" label="Knowledge" aria-describedby={LATER_NOTE_ID} onClick={later("Meeting knowledge")} />
        <Ctl icon="users" label="Invite" aria-describedby={LATER_NOTE_ID} onClick={later("Inviting people")} />
        <Ctl
          icon="agent-add"
          label="Add agent"
          aria-label={guest ? "Add agent (sign in to unlock)" : "Add agent"}
          aria-describedby={LATER_NOTE_ID}
          locked={guest}
          onClick={later("Adding agents")}
        />
        <Ctl
          icon={guest ? "info" : "dot"}
          label={guest ? "Concierge" : "My agent"}
          aria-label={guest ? "Ask the Concierge" : "Your private agent"}
          aria-describedby={LATER_NOTE_ID}
          onClick={later(guest ? "Asking the Concierge" : "Your private agent panel")}
        />
        <Link
          to="/"
          aria-label="Leave meeting"
          className={cn(ctlClass, toneClass.leave, "no-underline")}
        >
          <KmIcon name="leave" />
          <span className={labelClass}>Leave</span>
        </Link>
      </CtlGroup>
    </nav>
  );
}
