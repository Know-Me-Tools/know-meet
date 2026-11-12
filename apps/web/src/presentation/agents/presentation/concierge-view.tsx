// TJ-ARCH-MOB-001 compliant
// #concierge (agents.html `renderConcierge`): public page (guests included) about
// the system agent: what it does for guests, what it can't do, guest privacy, and a
// call to action that depends on whether the visitor is signed in.
import { buttonVariants } from "@know-meet/ui/components/button";
import { cardVariants } from "@know-meet/ui/components/card";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import {
  PageEyebrow,
  PageHead,
  PageHeadText,
  PageSub,
  PageTitle,
} from "@know-meet/ui/components/page-head";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { useSessionUser } from "../../shared/session";
import { useDocumentTitle } from "../../shared/use-document-title";
import { useAgentsState } from "./agents-state";
import { Crumbs } from "./agents-ui";

const sectionClass = "grid grid-cols-[minmax(0,1fr)] gap-s4";
const grid3Class =
  "grid grid-cols-3 gap-s4 max-bp1024:grid-cols-2 max-bp768:grid-cols-[minmax(0,1fr)]";

function Feature({
  icon,
  title,
  tone,
  children,
}: {
  readonly icon: KmIconName;
  readonly title: string;
  readonly tone: "ember" | "cyan";
  readonly children: React.ReactNode;
}) {
  return (
    <article className={cardVariants()}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 place-items-center rounded-base",
          tone === "cyan" ? "bg-cyan-soft text-cyan-text" : "bg-ember-soft text-ember-text",
        )}
      >
        <KmIcon name={icon} />
      </span>
      <h3 className="text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </article>
  );
}

function PlainList({
  kind,
  items,
}: {
  readonly kind: "yes" | "no";
  readonly items: readonly string[];
}) {
  return (
    <ul className="m-0 grid list-none gap-s2 p-0">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-s2 text-sm">
          <KmIcon
            name={kind === "yes" ? "check" : "x"}
            className={cn(
              "mt-px size-[18px]",
              kind === "yes" ? "text-green-text" : "text-red-text",
            )}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CallToAction({ signedIn }: { readonly signedIn: boolean }) {
  const primary = cn(buttonVariants(), focusFillClass);
  const secondary = cn(buttonVariants({ variant: "secondary" }), focusFillClass);
  return (
    <div className={cn(sectionClass, "mt-s7")}>
      <section
        aria-labelledby="cg-cta"
        className={cn(
          cardVariants({ variant: "panel" }),
          "grid-cols-[minmax(0,1fr)_auto] items-center gap-s5 max-bp768:grid-cols-[minmax(0,1fr)]",
        )}
      >
        <div className="grid content-start gap-s2">
          <h2 id="cg-cta" className="text-xl">
            {signedIn ? "Bring your own agents" : "Want your own agents in meetings?"}
          </h2>
          <p className="text-muted-foreground">
            {signedIn
              ? "Register a LiveKit Agents worker by its agent_name and dispatch it into meetings you host."
              : "Sign in to register LiveKit agents and use your dot. It’s optional — meetings work without it."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-s2">
          {signedIn ? (
            <>
              <Link to="/agents" hash="register:1" className={primary}>
                <KmIcon name="plus" className="size-4" />
                <span>Register an agent</span>
              </Link>
              <Link to="/agents" hash="registry" className={secondary}>
                <span>Your agents</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                hash={`sign-in?next=${encodeURIComponent("agents#registry")}`}
                className={primary}
              >
                <KmIcon name="user" className="size-4" />
                <span>Sign in to register agents</span>
              </Link>
              <Link to="/meet" hash="start" className={secondary}>
                <KmIcon name="cam" className="size-4" />
                <span>Start a guest meeting</span>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function ConciergeView() {
  useDocumentTitle("Concierge — Know Meet");
  const signedIn = useSessionUser() !== null;
  const { registry, workspace } = useAgentsState();
  const mono =
    registry.find((agent) => agent.id === "concierge")?.mono ??
    workspace.agents.find((agent) => agent.id === "concierge")?.mono ??
    "CG";

  return (
    <>
      <PageHead className="max-bp768:mb-s5 max-bp768:items-start">
        <PageHeadText>
          <Crumbs
            items={[{ label: "Agents", to: signedIn ? "registry" : "/" }, { label: "Concierge" }]}
          />
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-s5 max-bp768:grid-cols-[minmax(0,1fr)]">
            <AgentGlyph tone="system" className="w-[84px]">
              {mono}
            </AgentGlyph>
            <div className="grid content-start gap-s2">
              <PageEyebrow>System agent · provided by KnowMe</PageEyebrow>
              <PageTitle>Concierge</PageTitle>
              <PageSub className="max-w-[62ch] text-lg">
                The one agent that’s in every meeting, including meetings where nobody has an
                account. It helps guests follow along and shows what agents can do.
              </PageSub>
            </div>
          </div>
        </PageHeadText>
      </PageHead>
      <section aria-labelledby="cg-does" className={sectionClass}>
        <h2 id="cg-does" className="text-xl">
          What it does for guests
        </h2>
        <div className={grid3Class}>
          <Feature icon="chat" title="Answers questions about the meeting" tone="ember">
            Ask what was decided, who said what, or what you missed. It answers from the live
            transcript of this meeting.
          </Feature>
          <Feature icon="agent-add" title="Explains the other agents" tone="cyan">
            Describes what registered agents and dots in the room can do, and demonstrates them when
            the host allows it.
          </Feature>
          <Feature icon="cc" title="Works with live transcription" tone="ember">
            Everyone gets live captions. The Concierge reads the same transcript, so its answers
            match what was said.
          </Feature>
        </div>
      </section>
      <section aria-labelledby="cg-limits" className={cn(sectionClass, "mt-s7")}>
        <h2 id="cg-limits" className="text-xl">
          What it can’t do
        </h2>
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-s5 max-bp1024:grid-cols-[minmax(0,1fr)]">
          <div className={cardVariants()}>
            <PlainList
              kind="no"
              items={[
                "It can’t record the meeting or start a recording.",
                "It doesn’t remember anything after the meeting ends.",
                "It can’t read the host’s private files or anyone’s dot memory.",
                "It can’t be removed, renamed or reconfigured — KnowMe runs it.",
              ]}
            />
          </div>
          <div className={cardVariants()}>
            <h3 className="text-lg">Privacy for guests</h3>
            <PlainList
              kind="yes"
              items={[
                "In guest meetings the live transcript is deleted when the meeting ends.",
                "Guest meetings aren’t recorded, and no transcript or summary is sent.",
                "Invitees never need an account to join or to use the Concierge.",
              ]}
            />
          </div>
        </div>
      </section>
      <CallToAction signedIn={signedIn} />
    </>
  );
}
