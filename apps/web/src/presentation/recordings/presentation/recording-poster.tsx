// TJ-ARCH-MOB-001 compliant
// recordings.html `poster()`: a composed 16:9 mini tile layout standing in for the
// video frame (speaker: one large tile and a column; grid: 2 x 2), with the
// duration badge. `variant="thumb"` is the list-row form (`.rec-list .poster`:
// tighter padding, smaller initials, no badge). Decorative (aria-hidden): the
// card title and meta carry the information.
import { SpeakBadge } from "@know-meet/ui/components/speak-badge";
import { cn } from "@know-meet/ui/lib/utils";
import { formatDuration, initialsOf } from "../../workspace/application/format";
import type { Recording, Workspace } from "../../workspace/domain/workspace";
import { recordingAgents } from "../application/recordings-model";

type PosterVariant = "card" | "thumb";

interface PosterTile {
  readonly key: string;
  readonly text: string;
  readonly kind: "main" | "person" | "agent";
}

function tilesFor(workspace: Workspace, recording: Recording): readonly PosterTile[] {
  const people = recording.participants;
  const agent = recordingAgents(workspace, recording)[0];
  const isGrid = recording.layout === "grid";
  const shown = isGrid ? people.slice(0, 3) : [people[0] ?? "", ...people.slice(1, 3)];
  const tiles: PosterTile[] = shown.map((name, index) => ({
    key: `${name}-${index}`,
    text: initialsOf(name),
    kind: index === 0 ? "main" : "person",
  }));
  if (agent !== undefined) tiles.push({ key: agent.id, text: agent.mono, kind: "agent" });
  return tiles;
}

const TILE_CLASS: Readonly<Record<PosterTile["kind"], string>> = {
  main: "relative bg-tile-2 text-foreground",
  person: "bg-tile text-fg-sub",
  agent: "bg-cyan-soft font-mono text-cyan-text",
};

export function RecordingPoster({
  workspace,
  recording,
  variant = "card",
  className,
}: {
  readonly workspace: Workspace;
  readonly recording: Recording;
  readonly variant?: PosterVariant;
  readonly className?: string;
}) {
  const thumb = variant === "thumb";
  const isGrid = recording.layout === "grid";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid aspect-video bg-bg-2",
        isGrid ? "grid-cols-2 grid-rows-2" : "grid-cols-[3fr_1fr] grid-rows-3",
        thumb ? "gap-[3px] rounded-10 p-1" : "gap-1.5 p-s2",
        className,
      )}
    >
      {tilesFor(workspace, recording).map((tile) => (
        <span
          key={tile.key}
          className={cn(
            "grid min-h-0 min-w-0 place-items-center font-display font-semibold",
            thumb ? "rounded-[5px] text-10" : "rounded-8 text-13",
            TILE_CLASS[tile.kind],
            tile.kind === "agent" && "font-mono",
            tile.kind === "main" && !isGrid && "row-span-full",
            tile.kind === "main" && (thumb ? "text-sm" : "text-[clamp(18px,3vw,30px)]"),
          )}
        >
          {tile.text}
          {tile.kind === "main" ? <SpeakBadge className="absolute top-1.5 right-1.5" /> : null}
        </span>
      ))}
      {thumb ? null : (
        <span className="absolute right-3.5 bottom-3.5 rounded-pill bg-foreground px-s2 py-0.5 font-mono text-xs font-semibold text-background">
          {formatDuration(recording.durationMin * 60_000)}
        </span>
      )}
    </div>
  );
}
