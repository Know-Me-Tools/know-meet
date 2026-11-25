/** Opaque identity the token service assigns to one participant in one room. */
export type ParticipantIdentity = string & { readonly __brand: "ParticipantIdentity" };

/** Identities are opaque server values: this only marks a string as one. */
export function toParticipantIdentity(value: string): ParticipantIdentity {
  return value as ParticipantIdentity;
}

/** The two media a participant can send in a guest meeting. */
export type TrackKind = "microphone" | "camera";

/** The local participant's own microphone or camera. */
export interface LocalTrackState {
  /** True when nothing is being sent: muted, never enabled, or stopped. */
  readonly muted: boolean;
}

/** A remote participant's microphone or camera, as this client receives it. */
export interface RemoteTrackState {
  /** True when the participant sends nothing: muted, never published, or unpublished. */
  readonly muted: boolean;
  /** True when this client receives the track, so it can be attached to a media element. */
  readonly subscribed: boolean;
}

export interface LocalParticipant {
  readonly kind: "local";
  readonly identity: ParticipantIdentity;
  readonly displayName: string;
  readonly microphone: LocalTrackState;
  readonly camera: LocalTrackState;
}

export interface RemoteParticipant {
  /** Opaque transport identity of this particular room admission, when available. */
  readonly admissionKey?: string;
  readonly kind: "remote";
  readonly identity: ParticipantIdentity;
  readonly displayName: string;
  readonly microphone: RemoteTrackState;
  readonly camera: RemoteTrackState;
}

export type Participant = LocalParticipant | RemoteParticipant;

export function isTrackMuted(participant: Participant, kind: TrackKind): boolean {
  return participant[kind].muted;
}

/** Returns a copy of the local participant with one track's muted flag changed. */
export function withLocalTrackMuted(
  participant: LocalParticipant,
  kind: TrackKind,
  muted: boolean,
): LocalParticipant {
  const track: LocalTrackState = { muted };
  if (kind === "microphone") return { ...participant, microphone: track };
  return { ...participant, camera: track };
}
