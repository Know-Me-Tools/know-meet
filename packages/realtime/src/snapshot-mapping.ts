import {
  type ConnectionState,
  isInRoom,
  type LocalParticipant,
  type RemoteParticipant,
  toParticipantIdentity,
} from "@know-meet/domain";
import type { RoomSnapshot } from "@know-meet/application";
import { IDLE, sameConnection } from "./connection-mapping.ts";

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
  /** The name from the access token; empty or missing falls back to the identity. */
  readonly name: string | undefined;
  readonly microphone: TrackFacts;
  readonly camera: TrackFacts;
}

export interface RoomFacts {
  readonly connection: ConnectionState;
  readonly local: ParticipantFacts | null;
  /** In the SDK's order, which is the order participants were added. */
  readonly remotes: readonly ParticipantFacts[];
}

export const UNPUBLISHED: TrackFacts = { muted: true, subscribed: false };

const NO_REMOTES: readonly RemoteParticipant[] = [];

export const INITIAL_SNAPSHOT: RoomSnapshot = { connection: IDLE, local: null, remotes: NO_REMOTES };

/**
 * The snapshot for `facts`, reusing every unchanged part of `previous`. Returns `previous`
 * itself when nothing changed, so `useSyncExternalStore` sees a stable reference. Local and
 * remote participants exist only while the room is joined (connected or reconnecting).
 * Remotes keep the order they first appeared in; newcomers go to the end.
 */
export function nextSnapshot(previous: RoomSnapshot, facts: RoomFacts): RoomSnapshot {
  const connection = sameConnection(previous.connection, facts.connection)
    ? previous.connection
    : facts.connection;
  const inRoom = isInRoom(connection);
  const local = inRoom && facts.local !== null ? nextLocal(previous.local, facts.local) : null;
  const remotes = nextRemotes(previous.remotes, inRoom ? facts.remotes : []);
  const unchanged =
    connection === previous.connection &&
    local === previous.local &&
    remotes === previous.remotes;
  if (unchanged) return previous;
  return { connection, local, remotes };
}

function nextLocal(previous: LocalParticipant | null, facts: ParticipantFacts): LocalParticipant {
  const local = toLocal(facts);
  return previous !== null && sameLocal(previous, local) ? previous : local;
}

function nextRemotes(
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
    displayName: displayNameOf(facts),
    microphone: { muted: facts.microphone.muted, subscribed: facts.microphone.subscribed },
    camera: { muted: facts.camera.muted, subscribed: facts.camera.subscribed },
  };
}

function displayNameOf(facts: ParticipantFacts): string {
  return facts.name !== undefined && facts.name !== "" ? facts.name : facts.identity;
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
    a.displayName === b.displayName &&
    a.microphone.muted === b.microphone.muted &&
    a.microphone.subscribed === b.microphone.subscribed &&
    a.camera.muted === b.camera.muted &&
    a.camera.subscribed === b.camera.subscribed
  );
}

function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}
