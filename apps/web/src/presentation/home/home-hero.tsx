// TJ-ARCH-MOB-001 compliant
// index.html hero: the promise, Start a meeting / Sign in (or "Your meetings"
// when signed in), the guest note, Join with a code and, when signed in, the
// next-meeting card; the miniature room beside it (stacked below 1024px).
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { SampleMeeting } from "../public-shared/sample-meetings";
import {
  buttonLinkClass,
  displayClass,
  eyebrowClass,
  ledeClass,
} from "../public-shared/ui-classes";
import { HomeJoinForm } from "./home-join-form";
import { MiniRoom } from "./mini-room";
import { NextMeetingCard } from "./next-meeting-card";

const heroButton = "min-h-12 px-s5 max-bp421:w-full";

interface HomeHeroProps {
  readonly signedIn: boolean;
  readonly meetings: readonly SampleMeeting[];
  readonly now: Date;
}

export function HomeHero({ signedIn, meetings, now }: HomeHeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center gap-s7 pt-s7! max-bp1024:grid-cols-[minmax(0,1fr)] max-bp1024:gap-s6"
    >
      <div className="grid content-start gap-s5">
        <span className={eyebrowClass}>Know Meet · agentic video meetings</span>
        <h1 id="hero-title" className={`${displayClass} max-w-[12ch] max-bp1024:max-w-[16ch]`}>
          Meetings where agents do the{" "}
          <em className="text-ember-text not-italic">follow-through.</em>
        </h1>
        <p className={cn(ledeClass, "max-w-[52ch]")}>
          Your dot, the agents you register and a Concierge sit in the call with you, transcribe as
          you talk, and send everyone the transcript, summary and action items when you close.
        </p>
        <div className="flex flex-wrap items-center gap-s2">
          <Link
            to="/meet"
            hash="start"
            className={buttonLinkClass("default", "default", heroButton)}
          >
            <KmIcon name="cam" />
            <span>Start a meeting</span>
          </Link>
          {signedIn ? (
            <Link to="/dashboard" className={buttonLinkClass("secondary", "default", heroButton)}>
              <KmIcon name="calendar" />
              <span>Your meetings</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              hash="sign-in?next=dashboard"
              className={buttonLinkClass("secondary", "default", heroButton)}
            >
              <KmIcon name="user" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
        {signedIn ? null : (
          <p className="text-sm text-muted-foreground">
            No account needed to start: guests get the Concierge and live transcription.
          </p>
        )}
        <HomeJoinForm meetings={meetings} />
        {signedIn ? <NextMeetingCard meetings={meetings} now={now} /> : null}
      </div>
      <MiniRoom />
    </section>
  );
}
