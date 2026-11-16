// TJ-ARCH-MOB-001 compliant
// / (wr05 5.1): the home page, prototype index.html reduced to what this release does
// (web-release-acceptance.md H1-H3): the hero (start a meeting, join with a code) and the
// site footer. The bento, guest-or-signed-in table, Concierge section, meeting flow and
// next-meeting card are removed: they describe excluded features or sample data. Nothing
// here depends on the session, so km-auth changes nothing visible (WR-5), and every link
// targets `/`.
import { BrandMark } from "@know-meet/ui/components/brand-mark";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { SessionUserView } from "../shared/session";
import { useDocumentTitle } from "../shared/use-document-title";
import { HomeHero } from "./home-hero";

function HomeFooter() {
  return (
    <footer>
      <div className="mx-auto max-w-[1240px] px-s5 pt-s6 pb-s7 max-bp768:px-s4">
        <Link
          to="/"
          aria-label="Know Meet home"
          className={cn(
            "inline-flex min-h-size-target items-center gap-2.5 rounded-base text-foreground no-underline",
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
          Know Meet on this site runs real video meetings on LiveKit. Agents, transcripts and
          summaries are not in this release.
        </p>
      </div>
    </footer>
  );
}

interface HomeScreenProps {
  /**
   * Kept so the route keeps compiling. The home page renders the same for every visitor
   * (no "Sign in" or "Your meetings" in this release), so the session is not read.
   */
  readonly user?: SessionUserView | null;
}

export function HomeScreen(_props: HomeScreenProps) {
  useDocumentTitle("Know Meet — agentic video meetings");
  return (
    <div data-testid="km-screen-home">
      <div className="mx-auto w-full max-w-[1240px] px-s5 pb-s8 max-bp768:px-s4 max-bp768:pb-s7">
        <HomeHero />
      </div>
      <HomeFooter />
    </div>
  );
}
