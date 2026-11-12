// TJ-ARCH-MOB-001 compliant
// meet.html `.room-head`: the Gathering mark (home link), the meeting title (h1)
// with its meta line, then the recording indicator (only while recording; not in
// this static room), the Guest chip, the knowledge Sources chip and the theme
// toggle. Under 768px the Guest and Sources chips hide (`.hide-md`).
import { Badge } from "@know-meet/ui/components/badge";
import { BrandMark } from "@know-meet/ui/components/brand-mark";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import type { RoomModel } from "../domain/room";
import { LATER_NOTE_ID } from "./room-controls";

interface RoomHeadProps {
  readonly room: RoomModel;
  readonly participantCount: number;
  readonly onUnavailable: (what: string) => void;
  /** The frame's theme toggle, injected by the route (presentation never imports app code). */
  readonly themeControl: React.ReactNode;
}

function RoomMeta({ room, participantCount }: Pick<RoomHeadProps, "room" | "participantCount">) {
  const guest = room.mode === "guest";
  return (
    <span className="block truncate text-sm text-muted-foreground">
      {room.transcribing ? (
        <span>
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block size-size-pip rounded-round bg-pip-green align-[1px]"
          />
          {guest ? "Transcribing (deleted at end)" : "Transcribing"}
        </span>
      ) : (
        <span>Transcription off</span>
      )}
      {` · ${participantCount} in room · ${room.joinCode}`}
    </span>
  );
}

export function RoomHead({ room, participantCount, onUnavailable, themeControl }: RoomHeadProps) {
  return (
    <header className="flex min-h-header-h items-center gap-s3 px-s5 py-s3 max-bp768:gap-s2 max-bp768:px-s4 max-bp768:py-s2">
      <Link
        to="/"
        aria-label="Know Meet home"
        className={cn("inline-flex flex-none items-center rounded-base text-foreground", focusFillClass)}
      >
        <BrandMark />
      </Link>
      <div className="grid min-w-0 flex-1">
        <h1 tabIndex={-1} title={room.title} className="truncate text-lg outline-none">
          {room.title}
        </h1>
        <RoomMeta room={room} participantCount={participantCount} />
      </div>
      {room.mode === "guest" ? (
        <Badge variant="ember" className="max-bp768:hidden">
          Guest
        </Badge>
      ) : null}
      <Badge
        variant="cyan"
        render={<button type="button" />}
        aria-describedby={LATER_NOTE_ID}
        onClick={() => onUnavailable("Meeting knowledge")}
        className="min-h-9 px-3 max-bp768:hidden"
      >
        <KmIcon name="book" className="size-4" />
        <span>Sources</span>
      </Badge>
      {themeControl}
    </header>
  );
}
