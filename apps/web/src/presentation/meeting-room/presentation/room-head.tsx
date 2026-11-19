// TJ-ARCH-MOB-001 compliant
// meet.html `.room-head` for the guest room (acceptance R0-R6, section 3): the Gathering
// mark as a non-interactive mark (O-5: a brand link would leave the call without asking),
// h1 "Meeting {code}" (focused on entry), the meta line "{code} · {n} in the call", the
// connection chip and the theme toggle. Guest and Sources chips are removed; the
// recording notice (`.rec-ind`, wc10 task 10.4) sits before the connection chip while a
// recording runs, passed in by the room view.
// The chip text is always visible (K-3); disconnected never shows as a chip (view R7).
import type { ConnectionState } from "@know-meet/domain";
import { BrandMark } from "@know-meet/ui/components/brand-mark";
import { cn } from "@know-meet/ui/lib/utils";
import type * as React from "react";
import { useEffect, useRef } from "react";

interface RoomHeadProps {
  readonly code: string;
  readonly participantCount: number;
  readonly connection: ConnectionState;
  /** The frame's theme toggle, injected by the route (presentation never imports app code). */
  readonly themeControl: React.ReactNode;
  /** The recording notice while a recording runs anywhere in the room; null otherwise. */
  readonly recordingIndicator: React.ReactNode;
}

function ConnectionChip({ connection }: { readonly connection: ConnectionState }) {
  const connected = connection.status === "connected";
  const text = connected
    ? "Connected"
    : connection.status === "reconnecting"
      ? "Reconnecting…"
      : "Connecting…";
  return (
    // role="status" is the locator in acceptance 5.1; aria-live="off" keeps it out of the
    // announcements (5.3: the screen's one status region announces connection changes).
    <span
      role="status"
      aria-live="off"
      className={cn(
        "inline-flex min-w-0 flex-none items-center gap-1.5 rounded-pill px-2.5 py-1 text-sm font-semibold text-foreground",
        connected ? "bg-green-soft" : "bg-amber-soft",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-size-pip flex-none rounded-round",
          connected ? "bg-pip-green" : "bg-pip-amber",
        )}
      />
      <span className="whitespace-nowrap">{text}</span>
    </span>
  );
}

export function RoomHead({
  code,
  participantCount,
  connection,
  themeControl,
  recordingIndicator,
}: RoomHeadProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  const inCall = connection.status === "connected" || connection.status === "reconnecting";
  return (
    <header className="flex min-h-header-h items-center gap-s3 px-s5 py-s3 max-bp768:gap-s2 max-bp768:px-s4 max-bp768:py-s2">
      <span aria-hidden="true" className="inline-flex flex-none items-center text-foreground">
        <BrandMark />
      </span>
      <div className="grid min-w-0 flex-1">
        <h1 ref={headingRef} tabIndex={-1} className="truncate text-lg outline-none">
          Meeting {code}
        </h1>
        <span className="block truncate text-sm text-muted-foreground">
          <span data-testid="km-room-code">{code}</span>
          {inCall ? ` · ${participantCount} in the call` : " · Connecting…"}
        </span>
      </div>
      {recordingIndicator}
      <ConnectionChip connection={connection} />
      {themeControl}
    </header>
  );
}
