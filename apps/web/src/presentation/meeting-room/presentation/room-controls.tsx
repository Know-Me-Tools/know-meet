// TJ-ARCH-MOB-001 compliant
// meet.html `nav.controls` for the guest room (acceptance R2-R5, R9; section 3; wc04):
// the clock (left, hidden below 900), the media group (mic, camera, Share, then Record,
// wc10 task 10.4, prototype order) and the end
// group (the panel controls: Chat, then the Settings slot wc05 fills; Copy join link in
// the Invite slot, O-4; Leave). Mic, camera and Share are action buttons whose name and
// label change, with no aria-pressed (K-1); `data-state` carries on/off. Leave opens the
// prototype dialog (O-7).
// Below 768 (DESIGN.md "Room control bar below 768") the bar is one row that scrolls
// sideways in its own region: no wrap, start-aligned, hidden scrollbar, contained
// overscroll, and a focused control scrolls into view clear of the edge. Every control
// stays a tab stop, so the scroller itself is not one. At 768 and wider it is unchanged.
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
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useEffect, useState } from "react";
import { ROOM_COPY } from "../../guest-meeting/meeting-copy";
import { formatDuration } from "../../workspace/application/format";
import { Ctl, ctlClass, ctlLabelClass } from "./room-control";
import {
  ScreenShareControl,
  type ScreenShareControlProps,
} from "./screen-share/screen-share-control";

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
        <span className={ctlLabelClass}>Leave</span>
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

const barClass = cn(
  "grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-s3 px-s5 pt-s3 pb-s4",
  "max-bp900:flex max-bp900:justify-center",
  "max-bp768:flex-nowrap max-bp768:justify-start max-bp768:gap-s2 max-bp768:overflow-x-auto max-bp768:overscroll-x-contain max-bp768:scroll-px-s3 max-bp768:px-s3 max-bp768:pt-s2 max-bp768:pb-s3",
  "max-bp768:[scrollbar-width:none] max-bp768:[&::-webkit-scrollbar]:hidden",
);

const groupClass = "flex flex-none flex-nowrap items-center gap-s2";

export interface RoomControlsProps {
  readonly startedAt: number;
  readonly micOn: boolean;
  readonly cameraOn: boolean;
  readonly onToggleMic: () => void;
  readonly onToggleCamera: () => void;
  readonly share: ScreenShareControlProps;
  /** The Record control (`km-room-record`, wc10), after Share in the media group. */
  readonly recordControl: React.ReactNode;
  /**
   * Controls that open a room side-sheet pane, in bar order: Chat (wc04), then
   * Settings (`km-room-settings`, wc05). Rendered at the start of the end group.
   */
  readonly panelControls: React.ReactNode;
  readonly onCopyLink: () => void;
  readonly onLeave: () => void;
}

export function RoomControls(props: RoomControlsProps) {
  const { micOn, cameraOn } = props;
  return (
    <nav aria-label="Meeting controls" className={barClass}>
      <div className="flex items-center max-bp900:hidden">
        <RoomClock startedAt={props.startedAt} />
      </div>
      <div className={groupClass}>
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
        <ScreenShareControl {...props.share} />
        {props.recordControl}
      </div>
      <div className={cn(groupClass, "justify-end")}>
        {props.panelControls}
        <Ctl icon="link" label="Copy join link" tone="rest" onClick={props.onCopyLink} />
        <LeaveControl onLeave={props.onLeave} />
      </div>
    </nav>
  );
}
