// TJ-ARCH-MOB-001 compliant
// Room mic and camera (acceptance R5): toggles through the mute use case. The control's
// state comes from the room snapshot, so it shows what is actually sent. Success is
// announced ("Your microphone is off"); a refusal keeps the control off and shows the error
// card. Devices the browser refused during the join (carried in the URL) show the same card
// until the guest turns that device on.
import type { MediaError, MeetingUseCases } from "@know-meet/application";
import type { LocalParticipant, TrackKind } from "@know-meet/domain";
import { useCallback, useRef, useState } from "react";
import type { Announce } from "../../guest-meeting/live-status";
import {
  type ErrorCopy,
  roomBlockedCopy,
  roomToggleFailedCopy,
} from "../../guest-meeting/meeting-copy";

export interface LocalMedia {
  readonly toggle: (kind: TrackKind) => void;
  /** The device error to show, and whether it is a permission refusal. */
  readonly problem: { readonly copy: ErrorCopy; readonly permission: boolean } | null;
}

interface Failure {
  readonly kind: TrackKind;
  readonly error: MediaError;
}

function announcement(kind: TrackKind, nowMuted: boolean): string {
  const device = kind === "camera" ? "camera" : "microphone";
  return `Your ${device} is ${nowMuted ? "off" : "on"}`;
}

export function useLocalMedia(
  useCases: MeetingUseCases,
  local: LocalParticipant | null,
  blockedAtJoin: readonly TrackKind[],
  announce: Announce,
): LocalMedia {
  const [failure, setFailure] = useState<Failure | null>(null);
  const [cleared, setCleared] = useState<readonly TrackKind[]>([]);
  const busy = useRef(new Set<TrackKind>());

  const toggle = useCallback(
    (kind: TrackKind) => {
      if (local === null || busy.current.has(kind)) return;
      const nextMuted = !local[kind].muted;
      busy.current.add(kind);
      void useCases.setMuted(kind, nextMuted).then((result) => {
        busy.current.delete(kind);
        if (!result.ok) {
          setFailure({ kind, error: result.error });
          return;
        }
        setFailure(null);
        if (!nextMuted) setCleared((prev) => (prev.includes(kind) ? prev : [...prev, kind]));
        announce(announcement(kind, nextMuted));
      });
    },
    [useCases, local, announce],
  );

  const stillBlocked = blockedAtJoin.filter((kind) => !cleared.includes(kind));
  const blockedCopy = roomBlockedCopy(stillBlocked);
  const problem =
    failure !== null
      ? {
          copy: roomToggleFailedCopy(failure.kind, failure.error),
          permission: failure.error.code === "permission-denied",
        }
      : blockedCopy !== null
        ? { copy: blockedCopy, permission: true }
        : null;

  return { toggle, problem };
}
