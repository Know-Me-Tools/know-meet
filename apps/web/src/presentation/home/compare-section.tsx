// TJ-ARCH-MOB-001 compliant
// index.html "02 — Access": guest vs signed-in capabilities. A real table with a
// caption (sr-only) and row headers; each cell states its value in words with an
// icon (never colour alone). The table scrolls in its own named region when it
// overflows (RV-21, kit TableRegion).
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { TableRegion } from "@know-meet/ui/components/table-region";
import { Link } from "@tanstack/react-router";
import type { SessionUserView } from "../shared/session";
import { buttonLinkClass } from "../public-shared/ui-classes";
import { SectionHead } from "./section-head";

interface Cell {
  readonly included: boolean;
  readonly note?: string;
}

interface Row {
  readonly name: string;
  readonly detail?: string;
  readonly guest: Cell;
  readonly signedIn: Cell;
}

const NO: Cell = { included: false };
const YES: Cell = { included: true };

const ROWS: readonly Row[] = [
  { name: "Start or join a meeting", guest: YES, signedIn: YES },
  { name: "Concierge agent", detail: "The system agent in every room", guest: YES, signedIn: YES },
  {
    name: "Live transcription",
    guest: { included: true, note: "Deleted when the meeting ends" },
    signedIn: { included: true, note: "Saved with the meeting" },
  },
  { name: "Phone dial-in for invitees", detail: "Audio-only, via PIN", guest: YES, signedIn: YES },
  { name: "Registered agents", detail: "Scribe, Researcher, Facilitator, Translator, your own", guest: NO, signedIn: YES },
  { name: "Your dot and private agent panel", detail: "Iris, with private memory", guest: NO, signedIn: YES },
  { name: "Uploads to meeting knowledge", guest: NO, signedIn: YES },
  { name: "Recording", detail: "LiveKit Room Composite egress, MP4 or HLS", guest: NO, signedIn: YES },
  { name: "Transcript, summary and action items sent at close", detail: "Email and SMS", guest: NO, signedIn: YES },
  { name: "Recordings library", detail: "S3-compatible storage, pinned to IPFS", guest: NO, signedIn: YES },
  {
    name: "Scheduling and calendar connections",
    detail: "Google, Microsoft 365, iCloud / CalDAV",
    guest: NO,
    signedIn: YES,
  },
  { name: "Settings and delivery preferences", guest: NO, signedIn: YES },
];

function CapabilityCell({ cell }: { readonly cell: Cell }) {
  if (!cell.included) {
    return (
      <td className="align-top!">
        <span className="inline-flex items-start gap-2 text-muted-foreground">
          <KmIcon name="lock" className="mt-px size-[18px]" />
          <span>Sign in required</span>
        </span>
      </td>
    );
  }
  return (
    <td className="align-top!">
      <span className="inline-flex items-start gap-2">
        <KmIcon name="check" className="mt-px size-[18px] text-green-text" />
        <span>
          Included
          {cell.note === undefined ? null : <small className="block text-xs text-muted-foreground">{cell.note}</small>}
        </span>
      </span>
    </td>
  );
}

export function CompareSection({ user }: { readonly user: SessionUserView | null }) {
  return (
    <section aria-labelledby="cmp-title">
      <SectionHead id="cmp-title" eyebrow="02 — Access" title="Guest or signed in">
        Anyone can start or join a meeting. Signing in turns on everything that needs to remember you: agents, recording,
        delivery, storage and calendars.
      </SectionHead>
      <TableRegion caption="Capabilities available to guests compared with signed-in users">
        <thead>
          <tr>
            <th scope="col">Capability</th>
            <th scope="col" className="w-[30%] max-bp768:w-auto">
              Guest
            </th>
            <th scope="col" className="w-[30%] max-bp768:w-auto">
              Signed in
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.name}>
              <th scope="row" className="align-top! font-body text-sm font-semibold text-foreground">
                {row.name}
                {row.detail === undefined ? null : (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.detail}</span>
                )}
              </th>
              <CapabilityCell cell={row.guest} />
              <CapabilityCell cell={row.signedIn} />
            </tr>
          ))}
        </tbody>
      </TableRegion>
      <div className="mt-s4 flex flex-wrap items-center justify-between gap-s3">
        <p className="max-w-[64ch] text-sm text-muted-foreground">
          {user === null
            ? "You’re browsing as a guest. Invitees never need an account, whichever column the host is in."
            : `You’re signed in as ${user.name}, so everything in the Signed in column is on for meetings you host.`}
        </p>
        {user === null ? (
          <Link to="/auth" hash="sign-in?next=dashboard" className={buttonLinkClass("secondary")}>
            <KmIcon name="user" />
            <span>Sign in</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
