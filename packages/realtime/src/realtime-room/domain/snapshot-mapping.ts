import type { DeviceState, RoomSnapshot } from "@know-meet/application";
import {
  type ActiveDevices,
  type AudioPlayback,
  type BackgroundEffectState,
  type ChatMessage,
  type ConferencingSupport,
  type ConnectionState,
  DEFAULT_ACTIVE_DEVICES,
  isInRoom,
  type MediaDevice,
  NO_BACKGROUND_EFFECT_STATE,
  NOTHING_SUPPORTED,
  sameBackgroundEffect,
} from "@know-meet/domain";
import { IDLE, sameConnection } from "./connection-mapping.ts";
import { NO_DEVICES, sameActiveDevices, sameDevices } from "./device-mapping.ts";
import {
  NO_REMOTES,
  nextLocal,
  nextRemotes,
  type ParticipantFacts,
} from "./participant-mapping.ts";
import {
  NO_SCREEN_SHARES,
  nextScreenShares,
  type ScreenShareFacts,
} from "./screen-share-mapping.ts";

export {
  type ParticipantFacts,
  type TrackFacts,
  toLocal,
  toRemote,
  UNPUBLISHED,
} from "./participant-mapping.ts";

/**
 * Everything a snapshot is built from at one moment: what the SDK reports (connection,
 * participants, shares, playback, devices in use) and what the adapter itself holds (chat,
 * the device list, the background effect, support).
 */
export interface RoomFacts {
  readonly connection: ConnectionState;
  readonly local: ParticipantFacts | null;
  /** In the SDK's order, which is the order participants were added. */
  readonly remotes: readonly ParticipantFacts[];
  readonly screenShares: readonly ScreenShareFacts[];
  readonly chat: readonly ChatMessage[];
  readonly availableDevices: readonly MediaDevice[];
  readonly activeDevices: ActiveDevices;
  readonly audioPlayback: AudioPlayback;
  readonly backgroundEffect: BackgroundEffectState;
  readonly support: ConferencingSupport;
}

const NO_CHAT: readonly ChatMessage[] = [];

/** The snapshot of a room that has never connected. */
export function initialSnapshot(
  support: ConferencingSupport,
  available: readonly MediaDevice[] = NO_DEVICES,
): RoomSnapshot {
  return {
    connection: IDLE,
    local: null,
    remotes: NO_REMOTES,
    screenShares: NO_SCREEN_SHARES,
    chat: NO_CHAT,
    devices: { available, active: DEFAULT_ACTIVE_DEVICES },
    audioPlayback: "allowed",
    backgroundEffect: NO_BACKGROUND_EFFECT_STATE,
    support,
  };
}

export const INITIAL_SNAPSHOT: RoomSnapshot = initialSnapshot(NOTHING_SUPPORTED);

/**
 * The snapshot for `facts`, reusing every unchanged part of `previous`. Returns `previous`
 * itself when nothing changed, so `useSyncExternalStore` sees a stable reference. Local and
 * remote participants and screen shares exist only while the room is joined (connected or
 * reconnecting).
 */
export function nextSnapshot(previous: RoomSnapshot, facts: RoomFacts): RoomSnapshot {
  const connection = sameConnection(previous.connection, facts.connection)
    ? previous.connection
    : facts.connection;
  const inRoom = isInRoom(connection);
  const local = inRoom && facts.local !== null ? nextLocal(previous.local, facts.local) : null;
  const remotes = nextRemotes(previous.remotes, inRoom ? facts.remotes : []);
  const screenShares = nextScreenShares(
    previous.screenShares,
    inRoom ? facts.screenShares : [],
    remotes,
  );
  const next: RoomSnapshot = {
    connection,
    local,
    remotes,
    screenShares,
    chat: facts.chat.length === 0 ? NO_CHAT : facts.chat,
    devices: nextDevices(previous.devices, facts),
    audioPlayback: facts.audioPlayback,
    backgroundEffect: nextEffect(previous.backgroundEffect, facts.backgroundEffect),
    support: sameSupport(previous.support, facts.support) ? previous.support : facts.support,
  };
  return sameSnapshot(previous, next) ? previous : next;
}

function nextDevices(previous: DeviceState, facts: RoomFacts): DeviceState {
  const available = sameDevices(previous.available, facts.availableDevices)
    ? previous.available
    : facts.availableDevices;
  const active = sameActiveDevices(previous.active, facts.activeDevices)
    ? previous.active
    : facts.activeDevices;
  if (available === previous.available && active === previous.active) return previous;
  return { available, active };
}

function nextEffect(
  previous: BackgroundEffectState,
  next: BackgroundEffectState,
): BackgroundEffectState {
  const same =
    previous.status === next.status && sameBackgroundEffect(previous.effect, next.effect);
  return same ? previous : next;
}

function sameSupport(a: ConferencingSupport, b: ConferencingSupport): boolean {
  return (
    a.screenShare === b.screenShare &&
    a.backgroundEffects === b.backgroundEffects &&
    a.backgroundEffectsCause === b.backgroundEffectsCause &&
    a.speakerSelection === b.speakerSelection
  );
}

function sameSnapshot(a: RoomSnapshot, b: RoomSnapshot): boolean {
  return (
    a.connection === b.connection &&
    a.local === b.local &&
    a.remotes === b.remotes &&
    a.screenShares === b.screenShares &&
    a.chat === b.chat &&
    a.devices === b.devices &&
    a.audioPlayback === b.audioPlayback &&
    a.backgroundEffect === b.backgroundEffect &&
    a.support === b.support
  );
}
