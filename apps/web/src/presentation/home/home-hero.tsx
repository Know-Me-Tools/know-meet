// TJ-ARCH-MOB-001 compliant
// index.html hero (acceptance H1, H2, H2e; copy O-1): eyebrow and h1 kept as the
// owner-approved brand line, the release lede, "Start a meeting", the guest note, "Join
// with a code" and the miniature room beside it (two columns from 1024px, the prototype's
// single column below). "Sign in" and "Your meetings" are removed. Start asks the token
// service for a code and opens the lobby; while it waits the button keeps focus and its
// place (aria-disabled + aria-busy, never `disabled`).
import { Button } from "@know-meet/ui/components/button";
import { cn } from "@know-meet/ui/lib/utils";
import { BusyLabel } from "../guest-meeting/busy-label";
import { ErrorCard } from "../guest-meeting/error-card";
import { startErrorCopy } from "../guest-meeting/meeting-copy";
import { useStartMeeting } from "../guest-meeting/use-start-meeting";
import { displayClass, eyebrowClass, ledeClass } from "../public-shared/ui-classes";
import { HomeJoinForm } from "./home-join-form";
import { MiniRoom } from "./mini-room";

export function HomeHero() {
  const { busy, error, start } = useStartMeeting();
  return (
    <section
      aria-labelledby="hero-title"
      className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center gap-s7 py-s8 pt-s7 max-bp1024:grid-cols-[minmax(0,1fr)] max-bp1024:gap-s6 max-bp768:py-s7"
    >
      <div className="grid content-start gap-s5">
        <span className={eyebrowClass}>Know Meet · agentic video meetings</span>
        <h1 id="hero-title" className={`${displayClass} max-w-[12ch] max-bp1024:max-w-[16ch]`}>
          Meetings where agents do the{" "}
          <em className="text-ember-text not-italic">follow-through.</em>
        </h1>
        <p className={cn(ledeClass, "max-w-[52ch]")}>
          Start a video meeting in your browser and share the code. Agents, transcripts and
          summaries come next.
        </p>
        <div className="flex flex-wrap items-center gap-s2">
          <Button
            type="button"
            data-testid="km-home-start-meeting"
            aria-disabled={busy ? true : undefined}
            aria-busy={busy ? true : undefined}
            onClick={start}
            className="min-h-13 px-s5 text-base max-bp421:w-full"
          >
            <BusyLabel busy={busy} icon="cam" label="Start a meeting" busyLabel="Starting…" />
          </Button>
        </div>
        {error === null ? null : (
          <ErrorCard copy={startErrorCopy(error)} className="max-w-[460px]" />
        )}
        <p className="text-sm text-muted-foreground">
          No account needed. Guests start and join meetings in the browser.
        </p>
        <HomeJoinForm />
      </div>
      <MiniRoom />
    </section>
  );
}
