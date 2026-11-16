// TJ-ARCH-MOB-001 compliant
// Live-region announcements for remote changes and the connection (acceptance 5.3):
// "{name} joined", "{name} left", "{name} is muted" / "{name} unmuted",
// "Connection lost. Reconnecting…" and "Reconnected". Computed by diffing each new
// snapshot against the previous one; several changes in one snapshot are read together.
// Remote camera changes are not announced (the tile name changes).
import type { RoomSnapshot } from "@know-meet/application";
import type { RemoteParticipant } from "@know-meet/domain";
import { useEffect, useRef } from "react";
import type { Announce } from "../../guest-meeting/live-status";

function remoteChanges(
  before: readonly RemoteParticipant[],
  after: readonly RemoteParticipant[],
): string[] {
  const previous = new Map(before.map((remote) => [remote.identity, remote]));
  const current = new Set(after.map((remote) => remote.identity));
  const messages: string[] = [];
  for (const remote of after) {
    const old = previous.get(remote.identity);
    if (old === undefined) messages.push(`${remote.displayName} joined`);
    else if (old.microphone.muted !== remote.microphone.muted) {
      const name = remote.displayName;
      messages.push(remote.microphone.muted ? `${name} is muted` : `${name} unmuted`);
    }
  }
  for (const remote of before) {
    if (!current.has(remote.identity)) messages.push(`${remote.displayName} left`);
  }
  return messages;
}

function connectionChange(before: RoomSnapshot, after: RoomSnapshot): string | null {
  const was = before.connection.status;
  const is = after.connection.status;
  if (was === "connected" && is === "reconnecting") return "Connection lost. Reconnecting…";
  if (was === "reconnecting" && is === "connected") return "Reconnected";
  return null;
}

export function useRoomAnnouncements(snapshot: RoomSnapshot, announce: Announce): void {
  const previous = useRef(snapshot);
  useEffect(() => {
    const before = previous.current;
    previous.current = snapshot;
    if (before === snapshot) return;
    const messages = remoteChanges(before.remotes, snapshot.remotes);
    const connection = connectionChange(before, snapshot);
    if (connection !== null) messages.unshift(connection);
    if (messages.length > 0) announce(messages.join(". "));
  }, [snapshot, announce]);
}
