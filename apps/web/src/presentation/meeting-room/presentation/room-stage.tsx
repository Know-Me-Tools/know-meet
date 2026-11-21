// TJ-ARCH-MOB-001 compliant
// The participant stage (acceptance R1-R5; wc04 WC-1): screen-share tiles first, each a
// full-width row, then your tile, one tile per remote participant and the share card
// while alone (R1). Tile columns follow the stage width (meet.html `colsFor`); the stage
// scrolls vertically when tiles overflow and is centred when they do not fill it. From
// 1200 an open room sheet takes its width from the stage's end padding (meet.html
// `body[data-sheet-open] .stage`), so no tile hides under it.
import type { RealtimeRoom } from "@know-meet/application";
import type { LocalParticipant, RemoteParticipant, ScreenShare } from "@know-meet/domain";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { useRef } from "react";
import type { Announce } from "../../guest-meeting/live-status";
import { ROOM_COPY } from "../../guest-meeting/meeting-copy";
import { ShareCard } from "../../guest-meeting/share-card";
import type { VideoProcessorName } from "./background/background-options";
import { LocalTile, RemoteTile } from "./room-tiles";
import { ScreenShareTile } from "./screen-share/screen-share-tile";
import { useStageLayout } from "./use-stage-layout";

interface RoomStageProps {
  readonly room: RealtimeRoom;
  readonly code: string;
  readonly local: LocalParticipant | null;
  /** What the local published camera carries (background effects, WC-4). */
  readonly localProcessor: VideoProcessorName;
  readonly remotes: readonly RemoteParticipant[];
  readonly shares: readonly ScreenShare[];
  readonly sheetOpen: boolean;
  readonly announce: Announce;
}

function sharerName(share: ScreenShare, remotes: readonly RemoteParticipant[]): string | null {
  if (share.isLocal) return null;
  return remotes.find((remote) => remote.identity === share.identity)?.displayName ?? "";
}

export function RoomStage({
  room,
  code,
  local,
  localProcessor,
  remotes,
  shares,
  sheetOpen,
  announce,
}: RoomStageProps) {
  const alone = remotes.length === 0;
  const cells = (local === null ? 0 : 1) + remotes.length + (alone ? 1 : 0);
  const stageRef = useRef<HTMLElement>(null);
  const stage = useStageLayout(stageRef, cells);

  return (
    <section
      ref={stageRef}
      aria-label="Participants"
      tabIndex={stage.scrollable ? 0 : undefined}
      className={cn(
        "grid min-h-0 overflow-y-auto px-s5 pt-s2 pb-s4 [align-content:safe_center] max-bp768:px-s4 max-bp768:pb-s3",
        sheetOpen && "bp1200:pr-[calc(var(--spacing-rs-w)+var(--spacing-s5)+var(--spacing-s4))]",
        stage.scrollable &&
          cn(focusFillClass, "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!"),
      )}
    >
      <div
        className="grid gap-s3"
        style={{ gridTemplateColumns: `repeat(${stage.columns}, minmax(0, 1fr))` }}
      >
        {shares.map((share) => (
          <ScreenShareTile
            key={share.identity}
            room={room}
            share={share}
            sharerName={sharerName(share, remotes)}
          />
        ))}
        {local === null ? null : <LocalTile room={room} local={local} processor={localProcessor} />}
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
  );
}
