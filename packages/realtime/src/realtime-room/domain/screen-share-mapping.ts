import { type RemoteParticipant, type ScreenShare, toParticipantIdentity } from "@know-meet/domain";
import { sameItems } from "./participant-mapping.ts";

/** One screen-share publication as read from the SDK. */
export interface ScreenShareFacts {
  readonly identity: string;
  readonly isLocal: boolean;
  /** True when this client receives the video. The SDK reader sets it for the local share. */
  readonly subscribed: boolean;
  /** True when a screen-share audio track is published next to the video. */
  readonly hasAudio: boolean;
}

export const NO_SCREEN_SHARES: readonly ScreenShare[] = [];

/**
 * The port's order: the local share first, then remote shares in the order their sharers
 * appear in `remotes` (join order). Unchanged shares keep their references, and the previous
 * array is returned when nothing changed.
 */
export function nextScreenShares(
  previous: readonly ScreenShare[],
  facts: readonly ScreenShareFacts[],
  remotes: readonly RemoteParticipant[],
): readonly ScreenShare[] {
  const joinOrder = new Map<string, number>(
    remotes.map((remote, index) => [remote.identity, index]),
  );
  const rank = (fact: ScreenShareFacts): number =>
    fact.isLocal ? -1 : (joinOrder.get(fact.identity) ?? remotes.length);
  const ordered = [...facts]
    .filter((fact) => fact.isLocal || joinOrder.has(fact.identity))
    .sort((a, b) => rank(a) - rank(b))
    .map((fact) => reuse(previous, toScreenShare(fact)));
  if (sameItems(previous, ordered)) return previous;
  return ordered.length === 0 ? NO_SCREEN_SHARES : ordered;
}

function toScreenShare(facts: ScreenShareFacts): ScreenShare {
  return {
    identity: toParticipantIdentity(facts.identity),
    isLocal: facts.isLocal,
    subscribed: facts.isLocal || facts.subscribed,
    hasAudio: facts.hasAudio,
  };
}

function reuse(previous: readonly ScreenShare[], next: ScreenShare): ScreenShare {
  const prior = previous.find(
    (share) => share.identity === next.identity && share.isLocal === next.isLocal,
  );
  if (prior === undefined) return next;
  const same = prior.subscribed === next.subscribed && prior.hasAudio === next.hasAudio;
  return same ? prior : next;
}
