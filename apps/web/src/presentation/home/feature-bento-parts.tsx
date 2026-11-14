// TJ-ARCH-MOB-001 compliant
// Bento parts shared by the feature cards (`.f-foot`, the "Sign-in" lock chip)
// and the two cards with their own inner layout: recall (IPFS CID) and invite
// (delivery channels).
import { Badge } from "@know-meet/ui/components/badge";
import { KmIcon, type KmIconName } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { h3Class } from "../public-shared/ui-classes";

const featClass =
  "grid min-w-0 content-start gap-s3 rounded-tile bg-surface p-s5 shadow-(--shadow-card) [&_p]:text-sm [&_p]:text-muted-foreground max-bp1024:col-span-1 max-bp1024:row-auto max-bp768:col-auto";

export const smallLinkClass = "text-sm";

interface FeatProps {
  readonly id: string;
  readonly className: string;
  readonly children: React.ReactNode;
}

export function Feat({ id, className, children }: FeatProps) {
  return (
    <article aria-labelledby={id} className={cn(featClass, className)}>
      {children}
    </article>
  );
}

export function FeatIcon({ name }: { readonly name: KmIconName }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 place-items-center rounded-[12px] bg-muted text-foreground"
    >
      <KmIcon name={name} />
    </span>
  );
}

const CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

export function FeatureFoot({ children }: { readonly children: React.ReactNode }) {
  return <div className="mt-auto flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function LockChip({ label = "Sign-in" }: { readonly label?: string }) {
  return (
    <Badge>
      <KmIcon name="lock" />
      {label}
    </Badge>
  );
}

export function RecallFeature() {
  return (
    <Feat id="f-recall" className="col-span-3">
      <FeatIcon name="database" />
      <h3 id="f-recall" className={h3Class}>
        Recall the whole session
      </h3>
      <p>
        The combined video lands in S3-compatible storage, then KnowMe pins it to IPFS and keeps the
        CID with the transcript. Use KnowMe-managed storage or bring your own bucket and pinning
        service.
      </p>
      <div className="grid gap-1 rounded-base bg-background p-s3 light:bg-muted">
        <span className="text-xs text-muted-foreground">IPFS CID · Partner onboarding review</span>
        <span title={CID} className="block truncate font-mono text-xs">
          {CID}
        </span>
      </div>
      <FeatureFoot>
        <LockChip />
        <Link
          to="/recordings"
          hash="detail:partner-onboarding-1014:storage"
          className={smallLinkClass}
        >
          Open a stored recording
        </Link>
      </FeatureFoot>
    </Feat>
  );
}

const CHANNELS = [
  { icon: "mail", label: "Email" },
  { icon: "sms", label: "SMS" },
  { icon: "calendar", label: "Calendar invite" },
  { icon: "phone-in", label: "Phone dial-in" },
] as const;

export function InviteFeature() {
  return (
    <Feat
      id="f-invite"
      className="col-span-4 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start max-bp1024:col-span-2 max-bp768:col-auto max-bp768:grid-cols-[minmax(0,1fr)]"
    >
      <div className="grid gap-s3">
        <FeatIcon name="users" />
        <h3 id="f-invite" className={h3Class}>
          Invite anyone — no account required
        </h3>
        <p>
          Invitees open a link and join in the browser, or call in. Phone callers come in through a
          Telnyx SIP trunk and join audio-only with a PIN.
        </p>
        <FeatureFoot>
          <Badge variant="green">
            <KmIcon name="check" />
            Invitees: no account
          </Badge>
          <Link to="/join" hash="invite" className={smallLinkClass}>
            See what invitees see
          </Link>
        </FeatureFoot>
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-s2 p-0 max-bp421:grid-cols-[minmax(0,1fr)]">
        {CHANNELS.map((channel) => (
          <li
            key={channel.label}
            className="flex items-center gap-s2 rounded-base bg-card p-s3 text-sm font-semibold"
          >
            <KmIcon name={channel.icon} className="text-ember-text" />
            {channel.label}
          </li>
        ))}
      </ul>
    </Feat>
  );
}
