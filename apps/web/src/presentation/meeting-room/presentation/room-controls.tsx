// TJ-ARCH-MOB-001 compliant
// meet.html `nav.controls` for the guest room (acceptance R2-R5, R9; section 3): the clock
// (left, hidden below 900), the media group centred (mic, camera) and the end group (Copy
// join link in the Invite slot, O-4; Leave). Labels show under the icon from 900px; below
// that they are visually hidden (still in the name) and controls are 48px, and the four
// controls fit one row at 375 without a sideways scroller. Mic and camera are action
// buttons whose name and label change, with no aria-pressed (K-1); `data-state` carries
// on/off. Rest uses the `control` fill, off `control-invalid`, Leave `danger-btn`, so every
// control boundary meets 3:1 on the stage. Leave opens the prototype dialog (O-7).
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
import { Button } from "@know-meet/ui/components/button";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useEffect, useState } from "react";
import { ROOM_COPY } from "../../guest-meeting/meeting-copy";
import { formatDuration } from "../../workspace/application/format";

const ctlClass = cn(
  "relative grid min-h-14 min-w-16 flex-none content-center justify-items-center gap-0.5 rounded-base px-2 py-1.5 transition-colors duration-(--dur-fast) ease-standard",
  "max-bp1024:min-w-[54px] max-bp900:min-h-12 max-bp900:min-w-12 max-bp900:px-3 max-bp900:py-0",
  "data-[tone=rest]:bg-control data-[tone=rest]:text-on-control [@media(hover:hover)]:data-[tone=rest]:hover:bg-control-hov",
  "data-[tone=off]:bg-control-invalid data-[tone=off]:text-on-control-invalid",
  "data-[tone=leave]:bg-danger-btn data-[tone=leave]:text-on-danger [@media(hover:hover)]:data-[tone=leave]:hover:bg-danger-btn-hov",
  focusFillClass,
);

const labelClass =
  "block text-xs font-semibold whitespace-nowrap max-bp900:absolute max-bp900:size-px max-bp900:overflow-hidden max-bp900:[clip:rect(0_0_0_0)]";

type CtlTone = "rest" | "off" | "leave";

interface CtlProps extends Omit<React.ComponentProps<"button">, "children"> {
  readonly icon: KmIconName;
  readonly label: string;
  readonly tone: CtlTone;
}

function Ctl({ icon, label, tone, className, ...props }: CtlProps) {
  return (
    <button type="button" data-tone={tone} className={cn(ctlClass, className)} {...props}>
      <KmIcon name={icon} />
      <span className={labelClass}>{label}</span>
    </button>
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
    <span
      role="timer"
      aria-label="Time in meeting"
      className="font-mono text-13 text-muted-foreground"
    >
      {formatDuration(now - startedAt)}
    </span>
  );
}

function LeaveControl({ onLeave }: { readonly onLeave: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            data-tone="leave"
            data-testid="km-room-leave"
            className={ctlClass}
          />
        }
      >
        <KmIcon name="leave" />
        <span className={labelClass}>Leave</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ROOM_COPY.leaveTitle}</AlertDialogTitle>
          <AlertDialogDescription>{ROOM_COPY.leaveText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost">Stay</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            data-testid="km-room-leave-confirm"
            onClick={() => {
              setOpen(false);
              onLeave();
            }}
          >
            Leave meeting
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface RoomControlsProps {
  readonly startedAt: number;
  readonly micOn: boolean;
  readonly cameraOn: boolean;
  readonly onToggleMic: () => void;
  readonly onToggleCamera: () => void;
  readonly onCopyLink: () => void;
  readonly onLeave: () => void;
}

export function RoomControls(props: RoomControlsProps) {
  const { micOn, cameraOn } = props;
  return (
    <nav
      aria-label="Meeting controls"
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-s3 px-s5 pt-s3 pb-s4 max-bp900:flex max-bp900:justify-center max-bp768:gap-s2 max-bp768:px-s3 max-bp768:pt-s2 max-bp768:pb-s3"
    >
      <div className="flex items-center max-bp900:hidden">
        <RoomClock startedAt={props.startedAt} />
      </div>
      <div className="flex items-center gap-s2">
        <Ctl
          icon={micOn ? "mic" : "mic-off"}
          label={micOn ? "Mute" : "Unmute"}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          tone={micOn ? "rest" : "off"}
          data-testid="km-room-mute-mic"
          data-state={micOn ? "on" : "off"}
          onClick={props.onToggleMic}
        />
        <Ctl
          icon={cameraOn ? "cam" : "cam-off"}
          label={cameraOn ? "Stop video" : "Start video"}
          tone={cameraOn ? "rest" : "off"}
          data-testid="km-room-mute-camera"
          data-state={cameraOn ? "on" : "off"}
          onClick={props.onToggleCamera}
        />
      </div>
      <div className="flex items-center justify-end gap-s2">
        <Ctl icon="link" label="Copy join link" tone="rest" onClick={props.onCopyLink} />
        <LeaveControl onLeave={props.onLeave} />
      </div>
    </nav>
  );
}
