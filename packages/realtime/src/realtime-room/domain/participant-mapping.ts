import {
  type LocalParticipant,
  type RemoteParticipant,
  toParticipantIdentity,
} from "@know-meet/domain";

/**
 * Plain facts read from the media SDK at one moment. The SDK reader produces them; nothing
 * here knows the SDK, so the mapping is testable with hand-made values.
 */
export interface TrackFacts {
  /** True when nothing is sent: muted, never published or unpublished. */
  readonly muted: boolean;
  /** True when this client receives the track. Ignored for the local participant. */
  readonly subscribed: boolean;
}

export interface ParticipantFacts {
  readonly identity: string;
  readonly admissionKey?: string;
  /** The name from the access token; empty or missing falls back to the identity. */
  readonly name: string | undefined;
  readonly microphone: TrackFacts;
  readonly camera: TrackFacts;
}

export const UNPUBLISHED: TrackFacts = { muted: true, subscribed: false };

export const NO_REMOTES: readonly RemoteParticipant[] = [];

export function nextLocal(
  previous: LocalParticipant | null,
  facts: ParticipantFacts,
): LocalParticipant {
  const local = toLocal(facts);
  return previous !== null && sameLocal(previous, local) ? previous : local;
}

/** Remotes keep the order they first appeared in; newcomers go to the end. */
export function nextRemotes(
  previous: readonly RemoteParticipant[],
  facts: readonly ParticipantFacts[],
): readonly RemoteParticipant[] {
  const byIdentity = new Map<string, ParticipantFacts>(facts.map((fact) => [fact.identity, fact]));
  const known = new Set<string>(previous.map((entry) => entry.identity));
  const ordered: RemoteParticipant[] = [];
  for (const prior of previous) {
    const fact = byIdentity.get(prior.identity);
    if (fact === undefined) continue;
    const remote = toRemote(fact);
    ordered.push(sameRemote(prior, remote) ? prior : remote);
  }
  for (const fact of facts) {
    if (!known.has(fact.identity)) ordered.push(toRemote(fact));
  }
  if (sameItems(previous, ordered)) return previous;
  return ordered.length === 0 ? NO_REMOTES : ordered;
}

export function toLocal(facts: ParticipantFacts): LocalParticipant {
  return {
    kind: "local",
    identity: toParticipantIdentity(facts.identity),
    displayName: displayNameOf(facts),
    microphone: { muted: facts.microphone.muted },
    camera: { muted: facts.camera.muted },
  };
}

export function toRemote(facts: ParticipantFacts): RemoteParticipant {
  return {
    kind: "remote",
    identity: toParticipantIdentity(facts.identity),
    ...(facts.admissionKey === undefined ? {} : { admissionKey: facts.admissionKey }),
    displayName: displayNameOf(facts),
    microphone: { muted: facts.microphone.muted, subscribed: facts.microphone.subscribed },
    camera: { muted: facts.camera.muted, subscribed: facts.camera.subscribed },
  };
}

/** The token name, or the identity when the name is missing or empty. */
export function displayNameFrom(identity: string, name: string | undefined): string {
  return name !== undefined && name !== "" ? name : identity;
}

function displayNameOf(facts: ParticipantFacts): string {
  return displayNameFrom(facts.identity, facts.name);
}

function sameLocal(a: LocalParticipant, b: LocalParticipant): boolean {
  return (
    a.identity === b.identity &&
    a.displayName === b.displayName &&
    a.microphone.muted === b.microphone.muted &&
    a.camera.muted === b.camera.muted
  );
}

function sameRemote(a: RemoteParticipant, b: RemoteParticipant): boolean {
  return (
    a.identity === b.identity &&
    a.admissionKey === b.admissionKey &&
    a.displayName === b.displayName &&
    a.microphone.muted === b.microphone.muted &&
    a.microphone.subscribed === b.microphone.subscribed &&
    a.camera.muted === b.camera.muted &&
    a.camera.subscribed === b.camera.subscribed
  );
}

/** Same length and the same entries by reference, in order. */
export function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}
