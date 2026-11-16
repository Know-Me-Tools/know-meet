// TJ-ARCH-MOB-001 compliant
// live/room.html `#share-card` (lobby L1) and its room composition (R1, acceptance
// section 2): the code in the mono `code-big` style with "Copy join code", the link in a
// `link-box` (fill `card`, mono small, truncates) with "Copy join link", and one line of
// copy. Copy buttons are ghost icon buttons (44px). No orb, no animation: the waiting orb
// is reserved for agents.
import { Button } from "@know-meet/ui/components/button";
import { KmIcon } from "@know-meet/ui/components/km-icon";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import type { Announce } from "./live-status";
import { joinLink } from "./meeting-routes";
import { copyJoinCode, copyJoinLink } from "./share-actions";

interface ShareCardProps {
  readonly code: string;
  readonly line: string;
  readonly announce: Announce;
  /** The R1 heading; the lobby card has none. */
  readonly heading?: React.ReactNode;
  readonly className?: string;
}

const rowClass = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-s2";

export function ShareCard({ code, line, announce, heading, className }: ShareCardProps) {
  return (
    <div className={cn("grid gap-s3 rounded-tile bg-surface p-s5", className)}>
      {heading}
      <div className={rowClass}>
        <code className="block truncate font-mono text-22 font-semibold tracking-code">{code}</code>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Copy join code"
          onClick={() => copyJoinCode(code, announce)}
        >
          <KmIcon name="copy" />
        </Button>
      </div>
      <div className={rowClass}>
        <span className="block truncate rounded-base bg-card px-s3 py-s2 font-mono text-sm">
          {joinLink(code)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Copy join link"
          onClick={() => copyJoinLink(code, announce)}
        >
          <KmIcon name="link" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{line}</p>
    </div>
  );
}
