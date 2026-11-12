// TJ-ARCH-MOB-001 compliant
// index.html "03 — The system agent" (the Concierge strip on ember-soft) and
// "04 — Start to finish" (four linked steps). Each step is one link card: the
// whole card takes the focus fill and its content reads `on-focus`.
import { Badge } from "@know-meet/ui/components/badge";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { buttonLinkClass, eyebrowClass, focusContentClass, h3Class } from "../public-shared/ui-classes";
import { SectionHead } from "./section-head";

const CONCIERGE_DOES = ["Greets and orients", "Answers from the live transcript", "Routes questions to the right agent"] as const;

export function ConciergeSection() {
  return (
    <section aria-labelledby="cg-title">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-s6 rounded-lg bg-ember-soft p-s6 max-bp1024:grid-cols-[auto_minmax(0,1fr)] max-bp768:grid-cols-[minmax(0,1fr)] max-bp768:gap-s4 max-bp768:p-s5">
        <div aria-hidden="true" className="relative grid aspect-square w-[132px] place-items-center rounded-28 bg-bg-2 max-bp768:w-24 light:bg-card">
          <AgentGlyph tone="system" className="w-[60%] rounded-18">
            CG
          </AgentGlyph>
          <Orb className="absolute -top-2.5 -right-2.5 w-9" />
        </div>
        <div className="grid gap-s3">
          <span className={eyebrowClass}>03 — The system agent</span>
          <h2 id="cg-title" className="text-2xl">
            Meet the Concierge
          </h2>
          <p className="max-w-[60ch] text-foreground">
            The Concierge is in every room, including guest rooms. It greets people as they arrive, explains what’s
            happening, answers questions from the live transcript, and tells guests what signing in would add. It’s the
            only agent guests get.
          </p>
          <ul aria-label="What the Concierge does" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {CONCIERGE_DOES.map((item) => (
              <Badge key={item} render={<li />} className="bg-bg-2 light:bg-card">
                {item}
              </Badge>
            ))}
          </ul>
        </div>
        <div className="grid gap-s2 max-bp1024:col-span-full max-bp1024:flex max-bp1024:flex-wrap">
          <Link to="/agents" hash="concierge" className={buttonLinkClass("default")}>
            <span>About the Concierge</span>
            <KmIcon name="chevron-right" className="size-4" />
          </Link>
          <Link to="/meet" hash="start" className={buttonLinkClass("secondary")}>
            <KmIcon name="cam" />
            <span>Try it as a guest</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    to: "/dashboard",
    hash: "schedule",
    title: "Schedule & invite",
    text: "Pick a time, add people by email or phone, and choose which agents join. Invites go out by email, SMS and calendar.",
    go: "Schedule form",
  },
  {
    to: "/meet",
    hash: "room:agents",
    title: "Meet with agents",
    text: "Your dot and the Concierge are already there. Dispatch Scribe, Researcher or others whenever you need them.",
    go: "Add an agent",
  },
  {
    to: "/meet",
    hash: "room:transcript",
    title: "Record & transcribe",
    text: "The transcript builds as you talk. Start a Room Composite recording when everyone has agreed.",
    go: "Live transcript",
  },
  {
    to: "/meet",
    hash: "processing",
    title: "Summary delivered",
    text: "On close: recording finalized to S3, pinned to IPFS, summary written and sent to every participant.",
    go: "After the meeting",
  },
] as const;

export function FlowSection() {
  return (
    <section aria-labelledby="flow-title">
      <SectionHead id="flow-title" eyebrow="04 — Start to finish" title="How a meeting flows">
        Four steps, each one a screen you can open now.
      </SectionHead>
      <ol className="m-0 grid list-none grid-cols-4 gap-s3 p-0 max-bp1024:grid-cols-2 max-bp768:grid-cols-[minmax(0,1fr)]">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative">
            <Link
              to={step.to}
              hash={step.hash}
              className={cn(
                "group/step grid h-full gap-s2 rounded-tile bg-surface p-s5 text-inherit no-underline shadow-(--shadow-card) transition-colors duration-(--dur-fast) hover:bg-card-hov",
                focusFillClass,
                focusContentClass,
              )}
            >
              <span className="font-mono text-13 font-semibold text-ember-text">{String(index + 1).padStart(2, "0")}</span>
              <h3 className={h3Class}>{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.text}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-s2 text-sm font-semibold text-ember-text transition-transform duration-(--dur-fast) ease-out group-hover/step:translate-x-[3px]">
                {step.go}
                <KmIcon name="chevron-right" className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
