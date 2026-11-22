import type { ParticipantIdentity, TrackKind } from "../meeting/participant.ts";

/**
 * Every medium a media element can play: a participant's microphone or camera, or the
 * screen they share and the audio that comes with it.
 */
export type MediaSource = TrackKind | "screen-share" | "screen-share-audio";

/** One screen being shared in the room, by this participant or another (WC-1). */
export interface ScreenShare {
  readonly identity: ParticipantIdentity;
  /** True when this client is the one sharing. */
  readonly isLocal: boolean;
  /**
   * True when this client receives the shared video, so it can be attached. Always true
   * for the local share once it is published.
   */
  readonly subscribed: boolean;
  /** True when the share carries tab or system audio. */
  readonly hasAudio: boolean;
}

/** True when this client is sharing its screen. */
export function isSharingLocally(shares: readonly ScreenShare[]): boolean {
  return shares.some((share) => share.isLocal);
}

/**
 * Whether this browser can do a feature at all. Controls for an unsupported feature are
 * hidden or explained, never offered to fail (contract supported environments).
 */
export type Support = "supported" | "unsupported";

/**
 * Why background effects are unsupported, so the note can name a fix (W3,
 * web-conferencing-hardening): `browser` when the browser lacks a feature the effect engine
 * needs (including no WebGL2 context at all); `graphics` when WebGL2 exists but runs in software,
 * which turning on hardware acceleration usually fixes.
 */
export type BackgroundEffectsCause = "browser" | "graphics";

/** What this browser can do beyond microphone and camera. */
export interface ConferencingSupport {
  /** `getDisplayMedia` exists. Phone browsers usually lack it. */
  readonly screenShare: Support;
  /** The background processor's requirements are met (WC-4). */
  readonly backgroundEffects: Support;
  /** The cause when `backgroundEffects` is unsupported; null when supported. */
  readonly backgroundEffectsCause: BackgroundEffectsCause | null;
  /** `HTMLMediaElement.setSinkId` exists, so a speaker can be chosen (WC-6). */
  readonly speakerSelection: Support;
}

export const NOTHING_SUPPORTED: ConferencingSupport = {
  screenShare: "unsupported",
  backgroundEffects: "unsupported",
  backgroundEffectsCause: "browser",
  speakerSelection: "unsupported",
};

/**
 * Whether the browser lets this page play remote audio. Mirrors the media SDK's playback
 * flag; `blocked` is when the "Enable audio" prompt shows (WC-12).
 */
export type AudioPlayback = "allowed" | "blocked";
