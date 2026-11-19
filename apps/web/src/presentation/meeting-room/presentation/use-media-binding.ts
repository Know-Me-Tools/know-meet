// TJ-ARCH-MOB-001 compliant
// Binds a media element to one participant's medium through the RealtimeRoom port
// (`attachMedia`) for as long as the element is mounted; the port attaches, re-attaches
// and clears the track. Tiles never touch tracks themselves.
import type { RealtimeRoom } from "@know-meet/application";
import type { MediaSource, ParticipantIdentity } from "@know-meet/domain";
import { type RefObject, useEffect, useRef } from "react";

export function useMediaBinding<T extends HTMLMediaElement>(
  room: RealtimeRoom,
  identity: ParticipantIdentity,
  kind: MediaSource,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    return room.attachMedia({ identity, kind }, element);
  }, [room, identity, kind]);
  return ref;
}
