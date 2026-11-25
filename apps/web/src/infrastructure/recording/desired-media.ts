// TJ-ARCH-MOB-001 compliant
import type { MediaTarget, RecordingCapturePolicy, RoomSnapshot } from "@know-meet/application";
import type { Participant, ParticipantIdentity } from "@know-meet/domain";

export interface DesiredMedia {
  /** Stable only for this publication kind and this participant admission. */
  readonly key: string;
  readonly target: MediaTarget;
  readonly medium: "video" | "audio";
  readonly label: string;
}

function mediumFor(person: Participant, kind: MediaTarget["kind"]): DesiredMedia {
  const { identity } = person;
  const admissionKey = person.kind === "remote" ? person.admissionKey : undefined;
  const medium = kind === "camera" || kind === "screen-share" ? "video" : "audio";
  return {
    key: JSON.stringify([identity, admissionKey, kind]),
    target: admissionKey === undefined ? { identity, kind } : { identity, kind, admissionKey },
    medium,
    label: medium === "video" ? person.displayName : "",
  };
}

/** Decide eligibility before creating a tile, attaching a source, or drawing an identity. */
export function desiredMedia(
  snapshot: RoomSnapshot,
  allows: RecordingCapturePolicy["allows"] | undefined,
): readonly DesiredMedia[] {
  const media: DesiredMedia[] = [];
  const people = snapshot.local === null ? snapshot.remotes : [snapshot.local, ...snapshot.remotes];
  const eligible = new Map<ParticipantIdentity, Participant>();
  for (const person of people) {
    const admission = person.kind === "remote" ? person.admissionKey : undefined;
    if (!(allows?.(person.identity, admission) ?? person.kind === "local")) continue;
    eligible.set(person.identity, person);
    media.push(mediumFor(person, "camera"));
    if (person.kind === "remote") media.push(mediumFor(person, "microphone"));
  }
  for (const share of snapshot.screenShares) {
    const person = eligible.get(share.identity);
    if (!share.subscribed || person === undefined) continue;
    media.push(mediumFor(person, "screen-share"));
    if (share.hasAudio && !share.isLocal) media.push(mediumFor(person, "screen-share-audio"));
  }
  return media;
}
