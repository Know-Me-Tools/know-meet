// TJ-ARCH-MOB-001 compliant
// index.html hero `.mini` under operator decision O-2: the same composition with four
// human tiles only. No REC chip, no orb, no agent or phone glyph, no caption bar and no
// sample meeting title. The figure is a named group; its visual parts are hidden from AT
// and the figcaption says the same in words.
import { SpeakBadge } from "@know-meet/ui/components/speak-badge";

interface MiniPerson {
  readonly name: string;
  readonly initials: string;
  readonly speaking?: boolean;
}

const PEOPLE: readonly MiniPerson[] = [
  { name: "Avery", initials: "A", speaking: true },
  { name: "Marcus", initials: "M" },
  { name: "Jordan", initials: "J" },
  { name: "Priya", initials: "P" },
];

function Tile({ person }: { readonly person: MiniPerson }) {
  return (
    <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-base bg-tile">
      {person.speaking === true ? (
        <SpeakBadge tone="person" className="absolute top-1.5 right-1.5" />
      ) : null}
      <span className="grid aspect-square w-[40%] max-w-16 place-items-center rounded-round bg-tile-2 font-display text-[clamp(13px,1.4vw,20px)] leading-none font-semibold text-foreground uppercase">
        {person.initials}
      </span>
      <div className="absolute right-1.5 bottom-1.5 left-1.5 flex items-center gap-1 text-11 font-semibold text-foreground max-bp421:text-10">
        <span className="block truncate rounded-6 bg-bg-2 px-1.5 py-0.5 light:bg-card">
          {person.name}
        </span>
      </div>
    </div>
  );
}

export function MiniRoom() {
  return (
    <figure
      aria-labelledby="mini-cap"
      className="relative m-0 grid gap-s3 rounded-lg bg-bg-2 p-s3 max-bp1024:max-w-[640px] light:bg-card"
    >
      <div aria-hidden="true" className="grid grid-cols-2 gap-s2">
        {PEOPLE.map((person) => (
          <Tile key={person.name} person={person} />
        ))}
      </div>
      <figcaption id="mini-cap" className="px-s2 pb-s1 text-xs text-muted-foreground">
        A Know Meet room: four people on video, each joined from a browser with a code.
      </figcaption>
    </figure>
  );
}
