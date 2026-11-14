// TJ-ARCH-MOB-001 compliant
// index.html hero `.mini`: a miniature room composed from real room parts
// (people, a dial-in caller, your dot and the Concierge, live caption, REC).
// The figure is a named group; its visual parts are hidden from AT and the
// figcaption carries the same information in words.
import { AgentGlyph, PhoneGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { SpeakBadge } from "@know-meet/ui/components/speak-badge";
import type * as React from "react";

const TILE_GLYPH = "w-[44%] rounded-[14px] text-[clamp(12px,1vw+4px,17px)]";

function Tile({
  name,
  speaking = false,
  children,
}: {
  readonly name: string;
  readonly speaking?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-base bg-tile">
      {speaking ? <SpeakBadge tone="person" className="absolute top-1.5 right-1.5" /> : null}
      {children}
      <div className="absolute right-1.5 bottom-1.5 left-1.5 flex items-center gap-1 text-11 font-semibold text-foreground max-bp421:text-10">
        <span className="block truncate rounded-6 bg-bg-2 px-1.5 py-0.5 light:bg-card">{name}</span>
      </div>
    </div>
  );
}

function TileAvatar({ initials }: { readonly initials: string }) {
  return (
    <span className="grid aspect-square w-[46%] max-w-16 place-items-center rounded-round bg-tile-2 font-display text-[clamp(13px,1.4vw,20px)] leading-none font-semibold text-foreground uppercase">
      {initials}
    </span>
  );
}

export function MiniRoom() {
  return (
    <figure
      aria-labelledby="mini-cap"
      className="relative m-0 grid gap-s3 rounded-lg bg-bg-2 p-s3 shadow-(--shadow-float) max-bp1024:max-w-[640px] light:bg-card"
    >
      <div aria-hidden="true" className="flex items-center justify-between gap-s3 px-s2 pt-s1">
        <span className="block truncate font-display text-sm font-semibold">
          Partner onboarding review
        </span>
        <span className="inline-flex flex-none items-center gap-1.5 rounded-pill bg-red-soft px-2.5 py-1 font-mono text-11 font-semibold tracking-label text-foreground">
          <i className="size-size-pip rounded-round bg-pip-red" />
          REC 18:04
        </span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-3 gap-s2">
        <Tile name="Avery Chen" speaking>
          <TileAvatar initials="AC" />
        </Tile>
        <Tile name="Marcus Oyelaran">
          <TileAvatar initials="MO" />
        </Tile>
        <Tile name="Jordan Reyes">
          <TileAvatar initials="JR" />
        </Tile>
        <Tile name="Iris · your dot">
          <Orb className="w-[42%]" />
        </Tile>
        <Tile name="Concierge">
          <AgentGlyph tone="system" className={TILE_GLYPH}>
            CG
          </AgentGlyph>
        </Tile>
        <Tile name="Priya · dial-in">
          <PhoneGlyph className={TILE_GLYPH}>
            <KmIcon name="phone" />
          </PhoneGlyph>
        </Tile>
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s2 rounded-base bg-surface p-s3 text-sm"
      >
        <KmIcon name="cc" className="mt-px size-4 text-cyan-text" />
        <span>
          <b className="font-semibold">Avery Chen:</b> Let’s confirm the onboarding checklist before
          Friday — Scribe, can you capture that as an action?
        </span>
      </div>
      <figcaption id="mini-cap" className="px-s2 pb-s1 text-xs text-muted-foreground">
        A KnowMe room: three people on video, Priya on the phone dial-in, your dot Iris, and the
        Concierge — with live captions and recording on.
      </figcaption>
    </figure>
  );
}
