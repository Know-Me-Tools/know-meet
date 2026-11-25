import type { MediaTarget } from "@know-meet/application";
import type { MediaSource } from "@know-meet/domain";
import { type Room, Track } from "livekit-client";
import type { AttachableTrack, TrackResolver } from "../../application/media-bindings.ts";

/**
 * Which SDK track a target plays in `room` right now.
 * - Local camera and local screen share: the published track (the camera is kept while
 *   muted; the SDK restarts it in place).
 * - Local microphone and local screen-share audio: never, so a participant does not hear
 *   themselves.
 * - Remote media of any source: the subscribed track for the requested admission, if specified.
 */
export function createTrackResolver(room: Room | null): TrackResolver {
  return (target) => {
    if (room === null) return null;
    if (target.identity === room.localParticipant.identity) return localTrack(room, target);
    const remote = room.remoteParticipants.get(target.identity);
    if (remote === undefined) return null;
    if (target.admissionKey !== undefined && target.admissionKey !== remote.sid) return null;
    const publication = remote.getTrackPublication(sourceOf(target.kind));
    if (publication === undefined || !publication.isSubscribed) return null;
    return publication.track ?? null;
  };
}

function localTrack(room: Room, target: MediaTarget): AttachableTrack | null {
  if (target.kind === "microphone" || target.kind === "screen-share-audio") return null;
  return room.localParticipant.getTrackPublication(sourceOf(target.kind))?.track ?? null;
}

export function sourceOf(kind: MediaSource): Track.Source {
  switch (kind) {
    case "camera":
      return Track.Source.Camera;
    case "microphone":
      return Track.Source.Microphone;
    case "screen-share":
      return Track.Source.ScreenShare;
    case "screen-share-audio":
      return Track.Source.ScreenShareAudio;
  }
}
