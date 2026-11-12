// TJ-ARCH-MOB-001 compliant
// recordings.html `.stage`: the static Room Composite stub (no media is loaded).
// Tiles show initials or the agent mono; the current speaker carries the speaking
// badge (D-6: badges, not rings); captions and the big play button overlay it.
// The visual tiles are aria-hidden; a sentence describes the frame instead.
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { SpeakBadge } from "@know-meet/ui/components/speak-badge";
import { cn } from "@know-meet/ui/lib/utils";
import { initialsOf } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import { agentByName, type FlatSegment, recordingAgents } from "../application/recordings-model";

interface PlayerStageProps {
  readonly workspace: Workspace;
  readonly recording: Recording;
  readonly current: FlatSegment | null;
  readonly captions: boolean;
  readonly playing: boolean;
  readonly onPlay: () => void;
}

function tileOrder(workspace: Workspace, recording: Recording, speaker: string): readonly string[] {
  const tiles = [
    ...recording.participants,
    ...recordingAgents(workspace, recording).map((agent) => agent.name),
  ];
  if (recording.layout === "grid") return tiles.slice(0, 6);
  return [speaker, ...tiles.filter((name) => name !== speaker)].slice(0, 5);
}

export function PlayerStage({
  workspace,
  recording,
  current,
  captions,
  playing,
  onPlay,
}: PlayerStageProps) {
  const isGrid = recording.layout === "grid";
  const speaker = current?.who ?? recording.participants[0] ?? "";
  const layoutName = isGrid ? "grid" : "speaker";
  return (
    <div
      className={cn(
        "relative grid aspect-video gap-2 bg-background p-2.5",
        isGrid
          ? "grid-cols-3 grid-rows-2"
          : "grid-cols-[minmax(0,3fr)_minmax(0,1fr)] grid-rows-4 max-bp768:grid-cols-4 max-bp768:grid-rows-[minmax(0,3fr)_minmax(0,1fr)]",
      )}
    >
      <p className="sr-only">
        Room Composite recording, {layoutName} layout.
        {current === null ? "" : ` ${speaker} speaking.`}
      </p>
      {tileOrder(workspace, recording, speaker).map((name, index) => {
        const agent = agentByName(workspace, name);
        const isMain = !isGrid && index === 0;
        const speaking = current !== null && name === speaker;
        return (
          <div
            key={name}
            aria-hidden="true"
            className={cn(
              "relative grid min-h-0 min-w-0 place-items-center rounded-base bg-card",
              isMain && "row-span-full max-bp768:col-span-full max-bp768:row-span-1",
            )}
          >
            {agent === null ? (
              <span
                className={cn(
                  "inline-grid flex-none place-items-center rounded-round bg-muted font-display leading-none font-semibold uppercase",
                  isMain
                    ? "size-[clamp(48px,12vw,96px)] text-[clamp(18px,4vw,34px)]"
                    : "size-[clamp(22px,4vw,40px)] text-[clamp(10px,1.4vw,14px)]",
                )}
              >
                {initialsOf(name)}
              </span>
            ) : (
              <span className="grid aspect-square w-[clamp(24px,30%,64px)] place-items-center rounded-10 bg-cyan-soft font-mono text-[clamp(10px,1.4vw,16px)] font-semibold text-cyan-text">
                {agent.mono}
              </span>
            )}
            {speaking ? (
              <SpeakBadge
                tone={agent === null ? "person" : "agent"}
                className="absolute top-1.5 right-1.5"
              />
            ) : null}
            <span
              className={cn(
                "absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-pill bg-bg-2 px-2 py-px text-11 font-semibold text-foreground",
                !isMain && "max-bp768:hidden",
              )}
            >
              {name}
            </span>
          </div>
        );
      })}
      <span
        aria-hidden="true"
        className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-pill bg-bg-2 px-2 py-0.5 font-mono text-11 font-semibold text-foreground"
      >
        <KmIcon name="record" className="size-4" />
        <span>ROOM COMPOSITE · {recording.format.toUpperCase()}</span>
      </span>
      {captions && current !== null ? (
        <p className="absolute bottom-[18px] left-1/2 w-max max-w-[84%] -translate-x-1/2 rounded-10 bg-foreground px-3 py-1.5 text-center text-[clamp(12px,1.3vw,15px)] leading-[1.4] text-background max-bp768:bottom-2 max-bp768:text-xs">
          <b className="font-semibold">{current.who}: </b>
          {current.text}
        </p>
      ) : null}
      {playing ? null : (
        <button
          type="button"
          aria-label="Play recording"
          onClick={onPlay}
          className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-round bg-ember-btn text-on-ember shadow-(--shadow-float) outline-none focus-visible:bg-focus! focus-visible:text-on-focus!"
        >
          <KmIcon name="play" className="size-7 fill-current" />
        </button>
      )}
    </div>
  );
}
