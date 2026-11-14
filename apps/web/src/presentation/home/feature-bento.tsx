// TJ-ARCH-MOB-001 compliant
// index.html "01 — Inside the room": the six-column bento of what happens in a
// KnowMe meeting (two columns below 1024px, one below 768px). Each feature is an
// article named by its h3; illustrative fragments inside are hidden from AT.
import { Badge } from "@know-meet/ui/components/badge";
import { AgentGlyph } from "@know-meet/ui/components/glyph";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { Orb } from "@know-meet/ui/components/orb";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { eyebrowClass, h3Class } from "../public-shared/ui-classes";
import {
  Feat,
  FeatIcon,
  FeatureFoot,
  InviteFeature,
  LockChip,
  RecallFeature,
  smallLinkClass,
} from "./feature-bento-parts";
import { SectionHead } from "./section-head";

const AGENTS = [
  { mono: "SC", name: "Scribe", role: "Notes, decisions, action items" },
  { mono: "RS", name: "Researcher", role: "Cited answers from meeting knowledge" },
  { mono: "FA", name: "Facilitator", role: "Agenda and time boxes" },
  { mono: "TR", name: "Translator", role: "Live speech and captions" },
] as const;

function DotsFeature() {
  return (
    <Feat
      id="f-dots"
      className="col-span-4 row-span-2 grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-s5 bg-card max-bp1024:col-span-2 max-bp768:col-auto max-bp768:grid-cols-[minmax(0,1fr)]"
    >
      <div className="grid gap-s3">
        <span className={eyebrowClass}>Persistent dots</span>
        <h3 id="f-dots" className="text-xl">
          A dot that remembers you across every meeting
        </h3>
        <p>
          A dot is your always-on personal agent with its own private memory. Iris joins your calls,
          recalls what was decided last time, and keeps notes only you can read. Your colleagues
          bring theirs — Avery’s is Sol.
        </p>
        <FeatureFoot>
          <LockChip />
          <Link to="/agents" hash="dots" className={smallLinkClass}>
            How dots work
          </Link>
        </FeatureFoot>
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-s3">
        {[
          { name: "Iris", owner: "Your dot", tone: "ember" as const },
          { name: "Sol", owner: "Avery’s dot", tone: "cyan" as const },
        ].map((dot) => (
          <div
            key={dot.name}
            className="grid justify-items-center gap-s2 rounded-base bg-surface px-s2 py-s4 text-center"
          >
            <Orb tone={dot.tone} className="w-[64%]" />
            <strong className="font-display">{dot.name}</strong>
            <span className="text-xs text-muted-foreground">{dot.owner}</span>
          </div>
        ))}
      </div>
    </Feat>
  );
}

function AgentsFeature() {
  return (
    <Feat id="f-agents" className="col-span-2 row-span-2">
      <FeatIcon name="agent-add" />
      <h3 id="f-agents" className={h3Class}>
        Dispatch registered agents into the room
      </h3>
      <p>Register your own LiveKit agent workers once, then add them to any meeting mid-call.</p>
      <ul className="m-0 grid list-none gap-s2 p-0">
        {AGENTS.map((agent) => (
          <li
            key={agent.name}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-s3 text-sm"
          >
            <AgentGlyph size="sm">{agent.mono}</AgentGlyph>
            <div className="grid">
              <strong className="block">{agent.name}</strong>
              <small className="block text-xs text-muted-foreground">{agent.role}</small>
            </div>
          </li>
        ))}
      </ul>
      <FeatureFoot>
        <LockChip />
        <Link to="/agents" hash="registry" className={smallLinkClass}>
          Agent registry
        </Link>
      </FeatureFoot>
    </Feat>
  );
}

function SimpleFeature(props: {
  readonly id: string;
  readonly icon: KmIconName;
  readonly title: string;
  readonly className: string;
  readonly children: React.ReactNode;
}) {
  return (
    <Feat id={props.id} className={props.className}>
      <FeatIcon name={props.icon} />
      <h3 id={props.id} className={h3Class}>
        {props.title}
      </h3>
      {props.children}
    </Feat>
  );
}

export function FeatureBento() {
  return (
    <section aria-labelledby="feat-title">
      <SectionHead
        id="feat-title"
        eyebrow="01 — Inside the room"
        title="What happens in a KnowMe meeting"
      >
        Every room is a LiveKit room with agents as real participants. They hear the same audio,
        read the same transcript, and work from the same shared knowledge — so the work after the
        meeting is already done when it ends.
      </SectionHead>
      <div className="grid grid-cols-6 gap-s3 max-bp1024:grid-cols-2 max-bp768:grid-cols-[minmax(0,1fr)]">
        <DotsFeature />
        <AgentsFeature />
        <SimpleFeature
          id="f-private"
          icon="eye-off"
          title="A private agent panel only you see"
          className="col-span-2"
        >
          <p>
            Ask your dot or an agent a question mid-meeting without interrupting. Nobody else sees
            the thread.
          </p>
          <div aria-hidden="true" className="grid gap-1.5 rounded-base bg-card p-s3 text-sm">
            <span className={cn(eyebrowClass, "text-10")}>Only you · Iris</span>
            <span>What did Marcus commit to on Oct 14?</span>
          </div>
          <FeatureFoot>
            <LockChip />
          </FeatureFoot>
        </SimpleFeature>
        <SimpleFeature
          id="f-knowledge"
          icon="book"
          title="Shared meeting knowledge"
          className="col-span-2"
        >
          <p>
            Files you upload and every transcript segment feed one knowledge base that all agents in
            the room can read — including the Concierge.
          </p>
          <FeatureFoot>
            <LockChip label="Uploads: sign-in" />
            <Badge variant="green">
              <KmIcon name="check" />
              Live transcript: guests too
            </Badge>
          </FeatureFoot>
        </SimpleFeature>
        <SimpleFeature
          id="f-record"
          icon="record"
          title="Record and transcribe on the fly"
          className="col-span-2"
        >
          <p>
            Start recording any time. LiveKit Room Composite egress captures everyone in one layout
            as MP4 or HLS, with consent asked in the room.
          </p>
          <FeatureFoot>
            <LockChip />
            <Link to="/meet" hash="room:record-consent" className={smallLinkClass}>
              See the consent prompt
            </Link>
          </FeatureFoot>
        </SimpleFeature>
        <SimpleFeature
          id="f-close"
          icon="send"
          title="Transcript, summary and action items, sent at close"
          className="col-span-3 bg-card"
        >
          <p>
            When the host ends the meeting, KnowMe writes the summary and action items and delivers
            them to every participant automatically, per your delivery settings.
          </p>
          <ul className="m-0 grid list-none gap-s2 p-0">
            <li className="flex items-center gap-s2 text-sm">
              <KmIcon name="mail" className="size-4 text-green-text" />
              Email with transcript and summary attached
            </li>
            <li className="flex items-center gap-s2 text-sm">
              <KmIcon name="sms" className="size-4 text-green-text" />
              SMS with a link to the summary
            </li>
          </ul>
          <FeatureFoot>
            <LockChip />
            <Link to="/settings" hash="delivery" className={smallLinkClass}>
              Delivery settings
            </Link>
          </FeatureFoot>
        </SimpleFeature>
        <RecallFeature />
        <SimpleFeature
          id="f-cal"
          icon="calendar"
          title="Your calendars, connected"
          className="col-span-2"
        >
          <p>
            Meetings you schedule land on the calendar you already use, with the join link and
            dial-in attached.
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {["Google Calendar", "Microsoft 365 / Outlook", "iCloud / CalDAV"].map((name) => (
              <Badge key={name} render={<li />}>
                {name}
              </Badge>
            ))}
          </ul>
          <FeatureFoot>
            <LockChip />
            <Link to="/settings" hash="calendars" className={smallLinkClass}>
              Connect a calendar
            </Link>
          </FeatureFoot>
        </SimpleFeature>
        <InviteFeature />
      </div>
    </section>
  );
}
