import {
  type BackgroundEffect,
  type BackgroundEffectState,
  type ConferencingSupport,
  DEFAULT_ACTIVE_DEVICES,
  type DeviceChoice,
  type DisconnectReason,
  type LocalParticipant,
  NO_BACKGROUND_EFFECT_STATE,
  type RemoteParticipant,
  type ScreenShare,
} from "@know-meet/domain";
import type { RoomCredentials, RoomSnapshot } from "../ports.ts";

/** The fake assumes a capable desktop browser until a test says otherwise. */
export const FAKE_SUPPORT: ConferencingSupport = {
  screenShare: "supported",
  backgroundEffects: "supported",
  backgroundEffectsCause: null,
  speakerSelection: "supported",
};

export const FAKE_INITIAL: RoomSnapshot = {
  connection: { status: "idle" },
  local: null,
  remotes: [],
  screenShares: [],
  chat: [],
  devices: { available: [], active: DEFAULT_ACTIVE_DEVICES },
  audioPlayback: "allowed",
  backgroundEffect: NO_BACKGROUND_EFFECT_STATE,
  support: FAKE_SUPPORT,
};

/** The local participant as the media server reports it right after joining. */
export function localFor(credentials: RoomCredentials): LocalParticipant {
  return {
    kind: "local",
    identity: credentials.identity,
    displayName: credentials.identity,
    microphone: { muted: true },
    camera: { muted: true },
  };
}

/** A freshly connected room: session state cleared, the lobby's devices active. */
export function connectedFor(
  previous: RoomSnapshot,
  credentials: RoomCredentials,
  devices: DeviceChoice,
): RoomSnapshot {
  return {
    ...previous,
    connection: { status: "connected" },
    local: localFor(credentials),
    remotes: [],
    screenShares: [],
    chat: [],
    devices: {
      available: previous.devices.available,
      active: {
        ...previous.devices.active,
        microphone: devices.microphone,
        camera: devices.camera,
      },
    },
    backgroundEffect: NO_BACKGROUND_EFFECT_STATE,
  };
}

/** Session state cleared; what the browser reports (devices, support, playback) kept. */
export function disconnectedFrom(previous: RoomSnapshot, reason: DisconnectReason): RoomSnapshot {
  return {
    ...previous,
    connection: { status: "disconnected", reason },
    local: null,
    remotes: [],
    screenShares: [],
    chat: [],
    backgroundEffect: NO_BACKGROUND_EFFECT_STATE,
  };
}

/** Where an effect stands once accepted: idle for none, pending while the camera is off. */
export function effectStateFor(
  effect: BackgroundEffect,
  local: LocalParticipant,
): BackgroundEffectState {
  if (effect.kind === "none") return NO_BACKGROUND_EFFECT_STATE;
  return { effect, status: local.camera.muted ? "pending" : "active" };
}

export function upsertRemote(
  remotes: readonly RemoteParticipant[],
  remote: RemoteParticipant,
): readonly RemoteParticipant[] {
  const known = remotes.some((entry) => entry.identity === remote.identity);
  if (!known) return [...remotes, remote];
  return remotes.map((entry) => (entry.identity === remote.identity ? remote : entry));
}

/** Local share first, as the port orders them. */
export function withLocalShare(
  shares: readonly ScreenShare[],
  local: LocalParticipant,
): readonly ScreenShare[] {
  const own: ScreenShare = {
    identity: local.identity,
    isLocal: true,
    subscribed: true,
    hasAudio: false,
  };
  return [own, ...shares.filter((share) => !share.isLocal)];
}
