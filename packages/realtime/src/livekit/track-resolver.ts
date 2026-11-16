import type { MediaTarget } from "@know-meet/application";
import { type Room, Track } from "livekit-client";
import type { AttachableTrack, TrackResolver } from "../media-bindings.ts";

/**
 * Which SDK track a target plays in `room` right now.
 * - Local camera: the published camera track (kept while muted; the SDK restarts it in place).
 * - Local microphone: never, so a guest does not hear themselves.
 * - Remote camera or microphone: the track only while subscribed.
 */
export function createTrackResolver(room: Room | null): TrackResolver {
  return (target) => {
    if (room === null) return null;
    if (target.identity === room.localParticipant.identity) return localTrack(room, target);
    const publication = room.remoteParticipants
      .get(target.identity)
      ?.getTrackPublication(sourceOf(target));
    if (publication === undefined || !publication.isSubscribed) return null;
    return publication.track ?? null;
  };
}

function localTrack(room: Room, target: MediaTarget): AttachableTrack | null {
  if (target.kind === "microphone") return null;
  return room.localParticipant.getTrackPublication(Track.Source.Camera)?.track ?? null;
}

function sourceOf(target: MediaTarget): Track.Source {
  return target.kind === "camera" ? Track.Source.Camera : Track.Source.Microphone;
}
