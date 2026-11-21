// TJ-ARCH-MOB-001 compliant
// The views that replace the room (acceptance R7, R8): the join.html `.center-card` on the
// page ground under the lobby's slim bar (brand link to `/`, theme toggle). R7 "You were
// disconnected" (warn badge, Rejoin, Home); R8 "You left the meeting" (Rejoin, Start a new
// meeting, Home), with the reload line when this page load never joined. Camera and mic
// are already released: the room disconnected. Focus moves to the h1.
import { BrandMark } from "@know-meet/ui/components/brand-mark";
import { Button } from "@know-meet/ui/components/button";
import { Spinner } from "@know-meet/ui/components/spinner";
import { focusFillClass } from "@know-meet/ui/lib/focus";
import { cn } from "@know-meet/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { BusyLabel } from "../../guest-meeting/busy-label";
import { ErrorCard } from "../../guest-meeting/error-card";
import { ROOM_COPY, startErrorCopy } from "../../guest-meeting/meeting-copy";
import { lobbyHash } from "../../guest-meeting/meeting-routes";
import { useStartMeeting } from "../../guest-meeting/use-start-meeting";
import { CenterCard, StateBadge } from "../../join/center-card";
import { buttonLinkClass, h1Class } from "../../public-shared/ui-classes";

export type EndReason = "disconnected" | "left" | "reloaded" | "no-meeting";

interface RoomEndViewProps {
  readonly reason: EndReason;
  readonly code: string | null;
  readonly themeControl: React.ReactNode;
  /**
   * True right after Leave while this device's history is still being written (WC-7): the
   * actions wait, so the person cannot navigate away before the meeting is saved.
   */
  readonly saving?: boolean;
}

function SavingLine() {
  return (
    <p
      role="status"
      data-testid="km-room-end-saving"
      className="inline-flex items-center gap-s2 text-muted-foreground"
    >
      <Spinner aria-hidden="true" role="presentation" className="size-5" />
      <span>{ROOM_COPY.savingHistory}</span>
    </p>
  );
}

const HEADINGS: Readonly<Record<EndReason, string>> = {
  disconnected: ROOM_COPY.disconnectedHeading,
  left: ROOM_COPY.leftHeading,
  reloaded: ROOM_COPY.leftHeading,
  "no-meeting": "You’re not in a meeting",
};

const TEXTS: Readonly<Record<EndReason, string>> = {
  disconnected: ROOM_COPY.disconnectedText,
  left: ROOM_COPY.leftText,
  reloaded: ROOM_COPY.reloadText,
  "no-meeting": "Start a meeting or join one with a code from the home page.",
};

function EndBar({ themeControl }: { readonly themeControl: React.ReactNode }) {
  return (
    <header className="mx-auto flex min-h-header-h w-full max-w-[1120px] items-center gap-s3 px-s5 py-s3 max-bp768:px-s4">
      <Link
        to="/"
        aria-label="Know Meet home"
        className={cn(
          "inline-flex min-h-size-target flex-none items-center rounded-base px-s1 text-foreground no-underline",
          focusFillClass,
        )}
      >
        <BrandMark />
      </Link>
      <span className="flex-auto" />
      {themeControl}
    </header>
  );
}

export function RoomEndView({ reason, code, themeControl, saving = false }: RoomEndViewProps) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { busy, error, start } = useStartMeeting();
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  const disconnected = reason === "disconnected";
  const rejoin =
    code === null ? null : () => void navigate({ to: "/join", hash: lobbyHash(code, "joiner") });

  return (
    <>
      <EndBar themeControl={themeControl} />
      <div className="px-s5 pb-s8 max-bp768:px-s4">
        <CenterCard labelledBy="end-title">
          <div
            role={disconnected ? "alert" : "status"}
            data-testid={disconnected ? "km-state-disconnected" : undefined}
            className="grid justify-items-center gap-s4"
          >
            {disconnected ? <StateBadge icon="alert" tone="warn" /> : null}
            <h1
              id="end-title"
              ref={headingRef}
              tabIndex={-1}
              className={cn(h1Class, "outline-none")}
            >
              {HEADINGS[reason]}
            </h1>
            <p className="max-w-[46ch] text-muted-foreground">{TEXTS[reason]}</p>
          </div>
          {error === null ? null : (
            <ErrorCard copy={startErrorCopy(error)} className="w-full text-left" />
          )}
          {saving ? <SavingLine /> : null}
          <div
            hidden={saving}
            className="flex w-full flex-wrap justify-center gap-s2 max-bp768:grid"
          >
            {rejoin === null ? null : (
              <Button type="button" onClick={rejoin}>
                Rejoin
              </Button>
            )}
            {disconnected ? null : (
              <Button
                type="button"
                variant="ghost"
                aria-disabled={busy ? true : undefined}
                aria-busy={busy ? true : undefined}
                onClick={start}
              >
                <BusyLabel busy={busy} label="Start a new meeting" busyLabel="Starting…" />
              </Button>
            )}
            <Link to="/" className={buttonLinkClass(disconnected ? "secondary" : "ghost")}>
              Home
            </Link>
          </div>
        </CenterCard>
      </div>
    </>
  );
}
