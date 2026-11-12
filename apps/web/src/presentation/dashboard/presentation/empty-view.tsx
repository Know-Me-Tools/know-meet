// TJ-ARCH-MOB-001 compliant
// dashboard.html `#empty`: first run with no calendar and no meetings. Teaches
// the flow in three numbered steps, then offers the two ways to start.
import { buttonVariants } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { PageHead, PageHeadText, PageSub, PageTitle } from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useDocumentTitle } from "../../shared/use-document-title";

const STEPS: readonly { readonly lead: string; readonly rest: string }[] = [
  { lead: "Connect a calendar", rest: " — read your events and add KnowMe links to new ones." },
  { lead: "Schedule and invite", rest: " — by email, by SMS, or both." },
  { lead: "Meet with your agents", rest: " — the transcript and summary go out when the meeting ends." },
];

export function EmptyView() {
  useDocumentTitle("Get started · Meetings · Know Meet");
  return (
    <>
      <PageHead>
        <PageHeadText>
          <PageTitle>Meetings</PageTitle>
          <PageSub>No calendars connected and no meetings yet.</PageSub>
        </PageHeadText>
      </PageHead>
      <section
        aria-labelledby="empty-title"
        className="mx-auto grid w-full max-w-[640px] justify-items-center gap-s3 rounded-tile bg-surface px-s5 py-s7 text-center"
      >
        <div className="grid size-12 place-items-center rounded-14 bg-muted text-muted-foreground">
          <KmIcon name="calendar" className="size-7" />
        </div>
        <h2 id="empty-title" className="text-xl">
          Connect a calendar to see your meetings here
        </h2>
        <p className="max-w-measure-empty text-sm text-muted-foreground">
          Link Google Calendar, Outlook or any CalDAV calendar and your meetings show up in this list. Each event gets a KnowMe join
          link and phone dial-in details, so invitees can join from the browser or a phone — no account needed.
        </p>
        <ol className="my-s3 grid list-none gap-s3 p-0 text-left">
          {STEPS.map((step, index) => (
            <li key={step.lead} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s3 text-sm text-muted-foreground">
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-round bg-muted font-mono text-xs font-semibold text-foreground"
              >
                {index + 1}
              </span>
              <span>
                <b className="text-foreground">{step.lead}</b>
                {step.rest}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-s2">
          <Link to="/settings" hash="calendars" className={cn(buttonVariants(), focusFillClass)}>
            <KmIcon name="calendar" />
            <span>Connect a calendar</span>
          </Link>
          <Link to="/dashboard" hash="schedule" className={cn(buttonVariants({ variant: "secondary" }), focusFillClass)}>
            <KmIcon name="plus" />
            <span>Schedule a meeting</span>
          </Link>
        </div>
      </section>
    </>
  );
}
