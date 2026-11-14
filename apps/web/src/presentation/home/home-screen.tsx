// TJ-ARCH-MOB-001 compliant
// / (c10 10.1): the home page, index.html — hero, inside-the-room bento,
// guest vs signed-in, the Concierge, how a meeting flows, then the site footer.
// Signed-in state (km-auth) swaps Sign in for "Your meetings", drops the guest
// note, adds the next-meeting card and changes the access line.
import { BrandMark } from "@know-meet/ui/components/brand-mark";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { buildSampleMeetings } from "../public-shared/sample-meetings";
import type { SessionUserView } from "../shared/session";
import { useDocumentTitle } from "../shared/use-document-title";
import { CompareSection } from "./compare-section";
import { ConciergeSection, FlowSection } from "./concierge-flow";
import { FeatureBento } from "./feature-bento";
import { HomeHero } from "./home-hero";

const footLinkClass = cn(
  "inline-flex min-h-11 items-center rounded-base px-s3 text-sm font-semibold text-foreground no-underline hover:bg-card-hov",
  focusFillClass,
);

function HomeFooter() {
  return (
    <footer>
      <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)_auto] items-start gap-s5 px-s5 pt-s6 pb-s7 max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:px-s4">
        <div>
          <Link
            to="/"
            aria-label="Know Meet home"
            className={cn(
              "inline-flex items-center gap-2.5 rounded-base text-foreground no-underline",
              focusFillClass,
            )}
          >
            <BrandMark />
            <span
              aria-hidden="true"
              className="font-display text-lg font-bold tracking-heading whitespace-nowrap max-bp768:text-base"
            >
              Know <b className="font-bold text-ember-text in-focus-visible:text-current">Meet</b>
            </span>
          </Link>
          <p className="mt-s3 max-w-[70ch] text-xs text-muted-foreground">
            Prototype. Meetings, agents, recordings, SMS, phone and calendar connections on these
            pages are simulated with fictional sample data — nothing is sent or stored outside this
            browser.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap gap-x-s2 gap-y-s1 p-0">
            <li>
              <Link to="/agents" className={footLinkClass}>
                Agents
              </Link>
            </li>
            <li>
              <Link to="/settings" className={footLinkClass}>
                Settings
              </Link>
            </li>
            <li>
              <Link to="/join" hash="invite" className={footLinkClass}>
                Join as invitee
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function HomeScreen({ user }: { readonly user: SessionUserView | null }) {
  const [now] = useState(() => new Date());
  const meetings = useMemo(() => buildSampleMeetings(now), [now]);
  useDocumentTitle("Know Meet — agentic video meetings");
  return (
    <>
      <div className="mx-auto w-full max-w-[1240px] px-s5 max-bp768:px-s4 [&>section]:py-s8 max-bp768:[&>section]:py-s7">
        <HomeHero signedIn={user !== null} meetings={meetings} now={now} />
        <FeatureBento />
        <CompareSection user={user} />
        <ConciergeSection />
        <FlowSection />
      </div>
      <HomeFooter />
    </>
  );
}
