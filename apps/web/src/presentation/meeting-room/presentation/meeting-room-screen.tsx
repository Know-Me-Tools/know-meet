// TJ-ARCH-MOB-001 compliant
// c11 task 11.5: the meeting-room layout (meet.html #room and #room-guest) with
// media stubbed. RoomLayout gives this screen <main id="main"> and no app bar; the
// room owns its chrome: head, participant stage with captions, control bar.
// Out of scope this phase (D-2): side panels, #start, #lobby, #ended and
// #processing. Any other hash renders the room for the current session (signed
// in: full room; signed out: guest room), as meet.html `routeRoom` does for #room.
import { Toaster, toast } from "@know-meet/ui/components/toast";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSessionUser } from "../../shared/session";
import { useDocumentTitle } from "../../shared/use-document-title";
import { useHashRoute } from "../../shared/use-hash-route";
import { useSampleWorkspace } from "../../workspace/use-workspace";
import { buildRoomModel, roomModeFor } from "../application/room-fixture";
import type { RoomTile } from "../domain/room";
import { RoomControls } from "./room-controls";
import { RoomHead } from "./room-head";
import { RoomTileView, type TileActions } from "./room-tiles";
import { useStageLayout } from "./use-stage-layout";

/** Applies the local control state (mic, camera, paused dot) to the fixture tiles. */
function withLocalState(
  tiles: readonly RoomTile[],
  micOn: boolean,
  cameraOn: boolean,
  pausedDots: ReadonlySet<string>,
): RoomTile[] {
  return tiles.map((tile) => {
    if (tile.kind === "person" && tile.isSelf) return { ...tile, muted: !micOn, cameraOn };
    if (tile.kind === "dot" && pausedDots.has(tile.id)) return { ...tile, state: "paused" };
    return tile;
  });
}

function Captions() {
  return (
    <div className="flex justify-center px-s5 pb-s3 max-bp768:px-s3 max-bp768:pb-s2">
      <div
        aria-live="polite"
        className="grid min-h-[72px] w-[min(100%,760px)] gap-0.5 rounded-base bg-surface px-s4 py-s3 shadow-(--shadow-card)"
      >
        <span className="block font-mono text-11 font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Captions
        </span>
        <span className="block leading-[1.5]">Waiting for someone to speak…</span>
      </div>
    </div>
  );
}

export function MeetingRoomScreen({ themeControl }: { readonly themeControl: React.ReactNode }) {
  const { view } = useHashRoute();
  const user = useSessionUser();
  const { workspace } = useSampleWorkspace();
  const mode = roomModeFor(view, user !== null);
  const room = useMemo(() => buildRoomModel(workspace, mode, user?.name ?? null), [workspace, mode, user]);
  useDocumentTitle(`Know Meet — ${room.title}`);

  const [startedAt] = useState(() => Date.now());
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [pausedDots, setPausedDots] = useState<ReadonlySet<string>>(() => new Set());

  const tiles = withLocalState(room.tiles, micOn, cameraOn, pausedDots);
  const stageRef = useRef<HTMLElement>(null);
  const stage = useStageLayout(stageRef, tiles.length);

  const onUnavailable = useCallback((what: string) => {
    toast.add({ title: `${what} opens in a later release.`, type: "info" });
  }, []);
  const actions = useMemo<TileActions>(
    () => ({
      onUnavailable,
      onToggleDotPause: (id) =>
        setPausedDots((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
    }),
    [onUnavailable],
  );

  return (
    <Toaster>
      <div className="grid h-[calc(100dvh-var(--km-titlebar-h,0px))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <RoomHead room={room} participantCount={tiles.length} onUnavailable={onUnavailable} themeControl={themeControl} />
        <div className="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <section
            ref={stageRef}
            aria-label="Participants"
            tabIndex={stage.scrollable ? 0 : undefined}
            className={cn(
              "min-h-0 overflow-y-auto px-s5 pt-s2 pb-s4 max-bp768:px-s3 max-bp768:pb-s3",
              stage.scrollable && cn(focusFillClass, "focus-visible:**:bg-transparent! focus-visible:**:text-inherit!"),
            )}
          >
            <ul
              className="grid content-start gap-s3"
              style={{ gridTemplateColumns: `repeat(${stage.columns}, minmax(0, 1fr))` }}
            >
              {tiles.map((tile) => (
                <RoomTileView key={tile.id} tile={tile} actions={actions} />
              ))}
            </ul>
          </section>
          {captionsOn ? <Captions /> : <div aria-hidden="true" />}
        </div>
        <RoomControls
          mode={room.mode}
          startedAt={startedAt}
          micOn={micOn}
          cameraOn={cameraOn}
          captionsOn={captionsOn}
          onToggleMic={() => setMicOn((on) => !on)}
          onToggleCamera={() => setCameraOn((on) => !on)}
          onToggleCaptions={() => setCaptionsOn((on) => !on)}
          onUnavailable={onUnavailable}
        />
      </div>
    </Toaster>
  );
}
