// TJ-ARCH-MOB-001 compliant
// join.html invite aside "Other ways to join": dial-in numbers with the PIN
// (each copyable, numbers are tel: links) and the meeting link with .ics download.
import { Button } from "@know-meet/ui/components/button";
import { PhoneGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import type * as React from "react";
import type { DialInNumber, SampleMeeting } from "../public-shared/sample-meetings";
import { h3Class } from "../public-shared/ui-classes";
import { copyText, dialInSummary, downloadInviteIcs, inviteUrl } from "./invite-actions";

const sideCardClass =
  "grid gap-s3 rounded-tile bg-surface p-s5 shadow-(--shadow-card) [&>p]:text-sm [&>p]:text-muted-foreground";
const dialRowClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2 rounded-base bg-card py-s2 pr-s2 pl-s4";

interface JoinSideProps {
  readonly meeting: SampleMeeting;
  readonly numbers: readonly DialInNumber[];
  readonly announce: (message: string) => void;
}

function CopyButton({ label, onCopy }: { readonly label: string; readonly onCopy: () => void }) {
  return (
    <Button variant="ghost" size="icon" type="button" aria-label={label} onClick={onCopy}>
      <KmIcon name="copy" />
    </Button>
  );
}

export function JoinSide({ meeting, numbers, announce }: JoinSideProps) {
  const copy = (text: string, what: string) => () => {
    void copyText(text, what).then(announce);
  };
  return (
    <aside aria-label="Other ways to join" className="grid min-w-0 gap-s4">
      <section aria-labelledby="phone-title" className={sideCardClass}>
        <div className="flex items-center gap-s3">
          <PhoneGlyph className="w-11 rounded-[12px]">
            <KmIcon name="phone-in" />
          </PhoneGlyph>
          <h2 id="phone-title" className={h3Class}>
            Join by phone
          </h2>
        </div>
        <p>
          Call one of these numbers and enter the PIN followed by #. Phone callers join audio-only:
          you’ll hear everyone, including the agents, and appear as a phone tile.
        </p>
        <ul className="m-0 grid list-none gap-s2 p-0">
          {numbers.map((dial) => (
            <li key={dial.region} className={dialRowClass}>
              <div className="grid min-w-0">
                <small className="block text-xs text-muted-foreground">{dial.region}</small>
                <a
                  href={`tel:${dial.number.replace(/[^\d+]/g, "")}`}
                  className="block font-mono text-15 font-semibold text-foreground no-underline [overflow-wrap:anywhere] hover:text-ember-text hover:underline"
                >
                  {dial.number}
                </a>
              </div>
              <CopyButton
                label={`Copy ${dial.region} dial-in number`}
                onCopy={copy(dial.number, `${dial.region} dial-in number`)}
              />
            </li>
          ))}
        </ul>
        <div className={dialRowClass}>
          <div className="grid">
            <small className="text-xs text-muted-foreground">Meeting PIN</small>
            <span className="font-mono text-[20px] font-semibold tracking-label">
              {meeting.pin} #
            </span>
          </div>
          <CopyButton
            label="Copy meeting PIN"
            onCopy={copy(`${meeting.pin.replace(/\s/g, "")}#`, "Meeting PIN")}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          className="justify-self-start"
          onClick={copy(dialInSummary(meeting, numbers), "Dial-in details")}
        >
          <KmIcon name="copy" className="size-4" />
          <span>Copy all dial-in details</span>
        </Button>
      </section>
      <section aria-labelledby="link-title" className={sideCardClass}>
        <h2 id="link-title" className={`${h3Class} flex items-center gap-s2`}>
          <KmIcon name="link" />
          Meeting link
        </h2>
        <p>
          Code <InlineCode>{meeting.joinCode}</InlineCode> · works in any modern browser on desktop
          or phone.
        </p>
        <div className="flex flex-wrap items-center gap-s2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={copy(inviteUrl(meeting), "Meeting link")}
          >
            <KmIcon name="copy" className="size-4" />
            <span>Copy link</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => announce(downloadInviteIcs(meeting, numbers))}
          >
            <KmIcon name="download" className="size-4" />
            <span>Download .ics</span>
          </Button>
        </div>
      </section>
    </aside>
  );
}

/** km.css `code:not(.code)`: inline mono on `muted`. */
export function InlineCode({ children }: { readonly children: React.ReactNode }) {
  return (
    <code className="rounded-6 bg-muted px-1.5 py-px font-mono text-code-inline [overflow-wrap:anywhere]">
      {children}
    </code>
  );
}
