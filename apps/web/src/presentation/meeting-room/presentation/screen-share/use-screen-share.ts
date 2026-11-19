// TJ-ARCH-MOB-001 compliant
// The Share control's behaviour (WC-1). Its state comes from the room snapshot
// (`screenShares` holds the local share first), so it shows what is actually sent,
// including a share the browser ended from its own "Stop sharing" bar. The use case is
// called synchronously inside the click handler, with nothing awaited before it, so the
// browser still sees the user activation that its screen picker requires.
import type { ConferencingUseCases } from "@know-meet/application";
import { type ConferencingSupport, isSharingLocally, type ScreenShare } from "@know-meet/domain";
import { useCallback, useRef, useState } from "react";
import type { Announce } from "../../../guest-meeting/live-status";
import type { ScreenShareControlProps } from "./screen-share-control";
import { SHARE_COPY, shareErrorAnnouncement } from "./screen-share-copy";

export function useScreenShare(
  conferencing: ConferencingUseCases,
  shares: readonly ScreenShare[],
  support: ConferencingSupport,
  announce: Announce,
): ScreenShareControlProps {
  const sharing = isSharingLocally(shares);
  const available = support.screenShare === "supported";
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const onToggle = useCallback(() => {
    if (!available) {
      announce(SHARE_COPY.unsupported);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const starting = !sharing;
    void conferencing.toggleScreenShare().then((result) => {
      inFlight.current = false;
      setBusy(false);
      if (!result.ok) {
        const message = shareErrorAnnouncement(result.error);
        if (message !== null) announce(message);
        return;
      }
      announce(starting ? SHARE_COPY.started : SHARE_COPY.stopped);
    });
  }, [available, sharing, conferencing, announce]);

  return { sharing, available, busy, onToggle };
}
