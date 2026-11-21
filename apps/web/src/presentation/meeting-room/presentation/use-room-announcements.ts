// TJ-ARCH-MOB-001 compliant
// Live-region announcements for remote changes and the connection (acceptance 5.3):
// "{name} joined", "{name} left", "{name} is muted" / "{name} unmuted",
// "Connection lost. Reconnecting…" and "Reconnected". Computed by diffing each new
// snapshot against the previous one; several changes in one snapshot are read together.
// Remote camera changes are not announced (the tile name changes). wc04 adds remote
// screen shares: "{name} is sharing their screen" / "{name} stopped sharing" (the local
// share is announced by its control).
import type { RoomSnapshot } from "@know-meet/application";
import type { RemoteParticipant, ScreenShare } from "@know-meet/domain";
import { useEffect, useRef } from "react";
import type { Announce } from "../../guest-meeting/live-status";
import { remoteShareStarted, remoteShareStopped } from "./screen-share/screen-share-copy";

function remoteShareChanges(
  before: readonly ScreenShare[],
  after: readonly ScreenShare[],
  remotes: readonly RemoteParticipant[],
): string[] {
  const nameOf = (share: ScreenShare) =>
    remotes.find((remote) => remote.identity === share.identity)?.displayName ?? null;
  const was = new Set(before.filter((share) => !share.isLocal).map((share) => share.identity));
  const is = new Set(after.filter((share) => !share.isLocal).map((share) => share.identity));
  const messages: string[] = [];
  for (const share of after) {
    const name = nameOf(share);
    if (!share.isLocal && !was.has(share.identity) && name !== null) {
      messages.push(remoteShareStarted(name));
    }
  }
  for (const share of before) {
    const name = nameOf(share);
    // A sharer who left is already announced as having left.
    if (!share.isLocal && !is.has(share.identity) && name !== null) {
      messages.push(remoteShareStopped(name));
    }
  }
  return messages;
}

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
    const messages = [
      ...remoteChanges(before.remotes, snapshot.remotes),
      ...remoteShareChanges(before.screenShares, snapshot.screenShares, snapshot.remotes),
    ];
    const connection = connectionChange(before, snapshot);
    if (connection !== null) messages.unshift(connection);
    if (messages.length > 0) announce(messages.join(". "));
  }, [snapshot, announce]);
}
