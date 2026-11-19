// TJ-ARCH-MOB-001 compliant
import type { MediaTarget, RoomSnapshot } from "@know-meet/application";

/** One medium the recording needs from the room, as the snapshot says it exists now. */
export interface DesiredMedia {
  /** Stable while the medium exists; the binding is kept as long as the key is. */
  readonly key: string;
  readonly target: MediaTarget;
  readonly medium: "video" | "audio";
  /** The name drawn on the tile, empty for audio. */
  readonly label: string;
}

/**
 * Which media to bind for the recording: every participant's camera (a tile even when the
 * camera is off), every screen share this client receives (a tile), and the remote
 * microphones and share audio (mixed, not drawn).
 *
 * The local microphone is not here on purpose: the room never hands a participant their
 * own microphone through `attachMedia`, so it is captured separately (`local-microphone`).
 */
export function desiredMedia(snapshot: RoomSnapshot): readonly DesiredMedia[] {
  const media: DesiredMedia[] = [];
  const names = new Map<string, string>();
  if (snapshot.local !== null) names.set(snapshot.local.identity, snapshot.local.displayName);
  for (const remote of snapshot.remotes) names.set(remote.identity, remote.displayName);

  const people = [...(snapshot.local === null ? [] : [snapshot.local]), ...snapshot.remotes];
  for (const person of people) {
    media.push({
      key: `camera:${person.identity}`,
      target: { identity: person.identity, kind: "camera" },
      medium: "video",
      label: person.displayName,
    });
    if (person.kind === "remote") {
      media.push({
        key: `microphone:${person.identity}`,
        target: { identity: person.identity, kind: "microphone" },
        medium: "audio",
        label: "",
      });
    }
  }
  for (const share of snapshot.screenShares) {
    if (!share.subscribed) continue;
    const name = names.get(share.identity) ?? "";
    media.push({
      key: `screen-share:${share.identity}`,
      target: { identity: share.identity, kind: "screen-share" },
      medium: "video",
      label: name,
    });
    if (share.hasAudio && !share.isLocal) {
      media.push({
        key: `screen-share-audio:${share.identity}`,
        target: { identity: share.identity, kind: "screen-share-audio" },
        medium: "audio",
        label: "",
      });
    }
  }
  return media;
}
