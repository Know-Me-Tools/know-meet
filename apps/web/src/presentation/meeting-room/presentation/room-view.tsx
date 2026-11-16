// TJ-ARCH-MOB-001 compliant
// The live guest room (acceptance R0-R6, R9): head, the device error card when a device was
// refused, the participant stage (own tile, one tile per remote participant, and the share
// card while alone, R1) and the controls bar. The stage spans the full width with no
// captions bar and no side sheet, and is centred vertically when the tiles do not fill it.
import type { RoomSnapshot } from "@know-meet/application";
import type { TrackKind } from "@know-meet/domain";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useRef, useState } from "react";
import { ErrorCard } from "../../guest-meeting/error-card";
import { LiveStatus, useAnnouncer } from "../../guest-meeting/live-status";
import { ROOM_COPY } from "../../guest-meeting/meeting-copy";
import type { MeetingServicesView } from "../../guest-meeting/meeting-services";
import { copyJoinLink } from "../../guest-meeting/share-actions";
import { ShareCard } from "../../guest-meeting/share-card";
import { RoomControls } from "./room-controls";
import { RoomHead } from "./room-head";
import { LocalTile, RemoteTile } from "./room-tiles";
import { useLocalMedia } from "./use-local-media";
import { useRoomAnnouncements } from "./use-room-announcements";
import { useStageLayout } from "./use-stage-layout";

interface RoomViewProps {
  readonly services: MeetingServicesView;
  readonly snapshot: RoomSnapshot;
  readonly code: string;
  readonly blockedAtJoin: readonly TrackKind[];
  readonly themeControl: React.ReactNode;
}

export function RoomView({ services, snapshot, code, blockedAtJoin, themeControl }: RoomViewProps) {
  const { room, useCases } = services;
  const { local, remotes, connection } = snapshot;
  const { message, announce } = useAnnouncer();
  useRoomAnnouncements(snapshot, announce);
  const media = useLocalMedia(useCases, local, blockedAtJoin, announce);
  const [startedAt] = useState(() => Date.now());
  const alone = remotes.length === 0;
  const cells = (local === null ? 0 : 1) + remotes.length + (alone ? 1 : 0);
  const stageRef = useRef<HTMLElement>(null);
  const stage = useStageLayout(stageRef, cells);

  return (
    <div className="grid h-[calc(100dvh-var(--km-titlebar-h,0px))] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
      <RoomHead
        code={code}
        participantCount={(local === null ? 0 : 1) + remotes.length}
        connection={connection}
        themeControl={themeControl}
      />
      {media.problem === null ? (
        <div />
      ) : (
        <div className="px-s5 pb-s2 max-bp768:px-s4">
          <ErrorCard
            copy={media.problem.copy}
            {...(media.problem.permission ? { testId: "km-state-permission-denied" } : {})}
            className="mx-auto w-[min(100%,760px)]"
          />
        </div>
      )}
      <section
        ref={stageRef}
        aria-label="Participants"
        tabIndex={stage.scrollable ? 0 : undefined}
        className={cn(
          "grid min-h-0 overflow-y-auto px-s5 pt-s2 pb-s4 [align-content:safe_center] max-bp768:px-s4 max-bp768:pb-s3",
          stage.scrollable &&
            cn(focusFillClass, "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!"),
        )}
      >
        <div
          className="grid gap-s3"
          style={{ gridTemplateColumns: `repeat(${stage.columns}, minmax(0, 1fr))` }}
        >
          {local === null ? null : <LocalTile room={room} local={local} />}
          {remotes.map((remote) => (
            <RemoteTile key={remote.identity} room={room} remote={remote} />
          ))}
          {alone ? (
            <ShareCard
              code={code}
              line={ROOM_COPY.aloneLine}
              announce={announce}
              className="min-h-[160px] content-center"
              heading={<h2 className="font-display text-lg">{ROOM_COPY.aloneHeading}</h2>}
            />
          ) : null}
        </div>
      </section>
      <RoomControls
        startedAt={startedAt}
        micOn={local !== null && !local.microphone.muted}
        cameraOn={local !== null && !local.camera.muted}
        onToggleMic={() => media.toggle("microphone")}
        onToggleCamera={() => media.toggle("camera")}
        onCopyLink={() => copyJoinLink(code, announce)}
        onLeave={() => void useCases.leave()}
      />
      <LiveStatus message={message} />
    </div>
  );
}
