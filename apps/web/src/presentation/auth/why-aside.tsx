// TJ-ARCH-MOB-001 compliant
// auth.html `whyAside`: what an account adds, plus the guest shortcut. Static copy.
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { Link } from "@tanstack/react-router";
import { buttonLinkClass, eyebrowClass, h2Class } from "../public-shared/ui-classes";

const REASONS: readonly { readonly icon: KmIconName; readonly title: string; readonly detail: string }[] = [
  {
    icon: "agent-add",
    title: "Agents in your meetings",
    detail: "Bring your dot Iris and dispatch registered agents like Scribe and Researcher. Guests only get the Concierge.",
  },
  {
    icon: "record",
    title: "Recording and delivery",
    detail:
      "Record with Room Composite egress to your storage, and have the transcript, summary and action items sent to everyone at close.",
  },
  {
    icon: "calendar",
    title: "Calendars and scheduling",
    detail:
      "Connect Google Calendar, Microsoft 365 / Outlook or iCloud / CalDAV, and send invites by email, SMS and calendar.",
  },
];

export function WhyAside() {
  return (
    <aside aria-labelledby="why-title" className="grid gap-s4 py-s5 max-bp900:py-0">
      <span className={eyebrowClass}>Why sign in</span>
      <h2 id="why-title" className={h2Class}>
        Your account is what lets KnowMe remember.
      </h2>
      <ul className="m-0 grid list-none gap-s4 p-0">
        {REASONS.map((reason) => (
          <li key={reason.title} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-[12px] bg-surface text-ember-text">
              <KmIcon name={reason.icon} />
            </span>
            <div>
              <strong className="block font-display font-semibold">{reason.title}</strong>
              <span className="block text-sm text-muted-foreground">{reason.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-s3 rounded-tile bg-surface p-s4">
        <p className="text-sm text-muted-foreground">
          In a hurry? Guests can start or join a meeting right now with the Concierge and live transcription. The
          transcript is deleted when the meeting ends.
        </p>
        <Link to="/meet" hash="start" className={buttonLinkClass("secondary", "default", "justify-self-start")}>
          <KmIcon name="cam" />
          <span>Continue as guest</span>
        </Link>
      </div>
    </aside>
  );
}
