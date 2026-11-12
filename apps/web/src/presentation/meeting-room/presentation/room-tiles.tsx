// TJ-ARCH-MOB-001 compliant
// meet.html tiles (`humanTile`, `dotTile`, `agentTile`, `phoneTile`) with media
// stubbed: no <video>, an accessible placeholder in every tile. km.css `.tile`:
// head (chips, actions, speaking badge), media, foot (name, host chip, muted).
// Speaking is the D-6 badge in the head plus sr-only "speaking" text, never a ring
// or colour alone; muted is an icon tile plus sr-only text.
import { AgentGlyph, PhoneGlyph } from "@know-meet/ui/components/glyph";
import { Badge } from "@know-meet/ui/components/badge";
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { SpeakBadge } from "@know-meet/ui/components/speak-badge";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import {
  type AgentTile,
  type DotTile,
  type PersonTile,
  type PhoneTile,
  type PresenceState,
  presenceLabel,
  type RoomTile,
  tileLabel,
} from "../domain/room";
import { LATER_NOTE_ID } from "./room-controls";

export interface TileActions {
  /** Pause or resume your own dot (local state only). */
  readonly onToggleDotPause: (id: string) => void;
  /** Panels and agent management are out of scope (D-2): explains instead of acting. */
  readonly onUnavailable: (what: string) => void;
}

const tileClass =
  "relative grid aspect-[16/10] min-h-[180px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-tile bg-tile text-foreground max-bp481:aspect-[4/3] max-bp481:min-h-[160px]";

function SpeakingMark({ tone }: { readonly tone: "person" | "agent" | "phone" }) {
  return (
    <>
      <SpeakBadge tone={tone} className="ml-auto" />
      <span className="sr-only">Speaking</span>
    </>
  );
}

function TileHead({
  chips,
  actions,
  speaking,
  speakTone,
}: {
  readonly chips?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly speaking: boolean;
  readonly speakTone: "person" | "agent" | "phone";
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-s2 pt-s2 pr-s2 pl-s3">
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{chips}</div>
      {actions}
      {speaking ? <SpeakingMark tone={speakTone} /> : null}
    </div>
  );
}

function TileFoot({ children }: { readonly children: React.ReactNode }) {
  return <div className="flex min-h-11 items-center gap-s2 px-s3 pt-s2 pb-s3">{children}</div>;
}

function TileName({ children, title }: { readonly children: React.ReactNode; readonly title?: string }) {
  return (
    <span title={title} className="block min-w-0 flex-1 truncate text-sm font-semibold">
      {children}
    </span>
  );
}

function MutedMark({ label }: { readonly label: string }) {
  return (
    <span title={label} className="inline-grid size-7 flex-none place-items-center rounded-8 bg-red-soft">
      <KmIcon name="mic-off" className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

const glyphClass: Readonly<Record<PresenceState, string>> = {
  listening: "rounded-round bg-pip-green",
  thinking: "rotate-45 rounded-2 bg-pip-amber",
  speaking: "h-3 w-1 rounded-2 bg-cyan shadow-[6px_0_0_var(--cyan),-6px_0_0_var(--cyan)]",
  paused: "size-size-pip bg-muted-foreground",
};

/** km.css `.state-line`: shape and colour glyph plus the state word (never colour alone). */
function StateLine({ state }: { readonly state: PresenceState }) {
  return (
    <div className="mt-s3 inline-flex items-center justify-center gap-2 text-sm font-semibold">
      <span aria-hidden="true" className={cn("size-2.5 flex-none", glyphClass[state])} />
      <span>{presenceLabel(state)}</span>
    </div>
  );
}

function PresenceBody({ children }: { readonly children: React.ReactNode }) {
  return <div className="grid w-full content-center justify-items-center">{children}</div>;
}

function PersonCard({ tile }: { readonly tile: PersonTile }) {
  const name = `${tile.name}${tile.isSelf ? " (you)" : ""}`;
  return (
    <>
      <TileHead speaking={tile.speaking} speakTone="person" />
      <div className="grid min-h-0 place-items-center p-s2">
        <span
          aria-hidden="true"
          className="inline-grid aspect-square w-[clamp(64px,30%,104px)] flex-none place-items-center rounded-round bg-card font-display text-[clamp(22px,2vw+8px,36px)] leading-none font-semibold text-foreground uppercase"
        >
          {tile.initials}
        </span>
        <span className="sr-only">{tile.cameraOn ? "Camera on" : "Camera off"}</span>
      </div>
      <TileFoot>
        <TileName title={name}>{name}</TileName>
        {tile.isHost ? <Badge variant="ember">Host</Badge> : null}
        {tile.muted ? <MutedMark label="Muted" /> : null}
      </TileFoot>
    </>
  );
}

function DotCard({ tile, actions }: { readonly tile: DotTile; readonly actions: TileActions }) {
  const paused = tile.state === "paused";
  return (
    <>
      <TileHead
        speaking={tile.speaking}
        speakTone="agent"
        chips={<Badge variant={tile.mine ? "ember" : "cyan"}>{`Dot · ${tile.ownerLabel}`}</Badge>}
        actions={
          tile.mine ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={paused ? `Resume ${tile.name}` : `Pause ${tile.name}`}
              onClick={() => actions.onToggleDotPause(tile.id)}
            >
              <KmIcon name={paused ? "play" : "pause"} />
            </Button>
          ) : null
        }
      />
      <div className="grid min-h-0 place-items-center p-s2">
        <PresenceBody>
          <Orb tone={tile.tone} className={cn(paused && "animate-none opacity-45 grayscale")} />
          <StateLine state={tile.state} />
        </PresenceBody>
      </div>
      <TileFoot>
        <TileName>{tile.name}</TileName>
      </TileFoot>
    </>
  );
}

/** meet.html `.bars`: five voice bars, cyan (ember for the system agent), resting at 20%. */
function VoiceBars({ system, speaking }: { readonly system: boolean; readonly speaking: boolean }) {
  return (
    <div aria-hidden="true" className="mt-s3 flex h-6 items-center justify-center gap-1">
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "block h-6 w-1 rounded-2",
            system ? "bg-ember" : "bg-cyan",
            speaking ? "scale-y-[0.7]" : "scale-y-[0.2]",
          )}
        />
      ))}
    </div>
  );
}

function AgentCard({ tile, actions }: { readonly tile: AgentTile; readonly actions: TileActions }) {
  return (
    <>
      <TileHead
        speaking={tile.speaking}
        speakTone="agent"
        chips={
          <Badge variant={tile.system ? "ember" : "cyan"}>
            {tile.system ? "System agent" : `Agent · ${tile.role}`}
          </Badge>
        }
        actions={
          tile.system ? null : (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${tile.name} from the room`}
              aria-describedby={LATER_NOTE_ID}
              onClick={() => actions.onUnavailable(`Removing ${tile.name}`)}
            >
              <KmIcon name="remove" />
            </Button>
          )
        }
      />
      <div className="grid min-h-0 place-items-center p-s2">
        <PresenceBody>
          <AgentGlyph tone={tile.system ? "system" : "agent"}>{tile.mono}</AgentGlyph>
          <VoiceBars system={tile.system} speaking={tile.state === "speaking"} />
          <StateLine state={tile.state} />
        </PresenceBody>
      </div>
      <TileFoot>
        <TileName>{tile.name}</TileName>
      </TileFoot>
    </>
  );
}

function PhoneCard({ tile }: { readonly tile: PhoneTile }) {
  return (
    <>
      <TileHead
        speaking={tile.speaking}
        speakTone="phone"
        chips={
          <Badge variant="green">
            <KmIcon name="phone-in" />
            Dialed in
          </Badge>
        }
      />
      <div className="grid min-h-0 place-items-center p-s2">
        <PresenceBody>
          <PhoneGlyph>
            <KmIcon name="phone" />
          </PhoneGlyph>
          <span className="mt-s3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <KmIcon name="wave" className="size-4" />
            Audio only
          </span>
        </PresenceBody>
      </div>
      <TileFoot>
        <TileName title={tile.label}>{tile.label}</TileName>
        {tile.mutedByHost ? <MutedMark label="Muted by host" /> : null}
      </TileFoot>
    </>
  );
}

function TileBody({ tile, actions }: { readonly tile: RoomTile; readonly actions: TileActions }) {
  switch (tile.kind) {
    case "person":
      return <PersonCard tile={tile} />;
    case "dot":
      return <DotCard tile={tile} actions={actions} />;
    case "agent":
      return <AgentCard tile={tile} actions={actions} />;
    case "phone":
      return <PhoneCard tile={tile} />;
  }
}

/** One stubbed media tile; the list item carries the participant's name and role. */
export function RoomTileView({ tile, actions }: { readonly tile: RoomTile; readonly actions: TileActions }) {
  const state = tile.kind === "dot" || tile.kind === "agent" ? tile.state : undefined;
  return (
    <li
      aria-label={tileLabel(tile)}
      data-kind={tile.kind}
      data-state={state}
      data-speaking={tile.speaking ? "true" : "false"}
      className={tileClass}
    >
      <TileBody tile={tile} actions={actions} />
    </li>
  );
}
