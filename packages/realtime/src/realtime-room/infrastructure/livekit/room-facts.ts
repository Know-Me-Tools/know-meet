import type { ActiveDevices, ConnectionState } from "@know-meet/domain";
import { type Participant, type Room, Track } from "livekit-client";
import { activeDevicesFrom } from "../../domain/device-mapping.ts";
import type { ScreenShareFacts } from "../../domain/screen-share-mapping.ts";
import {
  type ParticipantFacts,
  type RoomFacts,
  type TrackFacts,
  UNPUBLISHED,
} from "../../domain/snapshot-mapping.ts";

/** The part of the facts the SDK room reports. */
export type SdkFacts = Pick<
  RoomFacts,
  "connection" | "local" | "remotes" | "screenShares" | "audioPlayback" | "activeDevices"
>;

/**
 * Reads the SDK room into plain facts. `room` is null before connecting and after leaving;
 * `requested` is what was asked for, used where the SDK reports no device in use yet.
 */
export function readRoomFacts(
  room: Room | null,
  connection: ConnectionState,
  requested: ActiveDevices,
): SdkFacts {
  if (room === null) {
    return {
      connection,
      local: null,
      remotes: [],
      screenShares: [],
      audioPlayback: "allowed",
      activeDevices: requested,
    };
  }
  // `remoteParticipants` is a Map keyed by identity; its iteration order is insertion order.
  const remotes = [...room.remoteParticipants.values()];
  return {
    connection,
    local: readParticipant(room.localParticipant),
    remotes: remotes.map(readParticipant),
    screenShares: [room.localParticipant, ...remotes].flatMap(readScreenShare),
    audioPlayback: room.canPlaybackAudio ? "allowed" : "blocked",
    activeDevices: activeDevicesFrom((kind) => room.getActiveDevice(kind), requested),
  };
}

function readParticipant(participant: Participant): ParticipantFacts {
  return {
    identity: participant.identity,
    name: participant.name,
    microphone: readTrack(participant, Track.Source.Microphone),
    camera: readTrack(participant, Track.Source.Camera),
  };
}

function readTrack(participant: Participant, source: Track.Source): TrackFacts {
  const publication = participant.getTrackPublication(source);
  if (publication === undefined) return UNPUBLISHED;
  // Remote publications override `isSubscribed` (false while unsubscribed or not allowed).
  return { muted: publication.isMuted, subscribed: publication.isSubscribed };
}

/**
 * The participant's screen share, if one is published. The local share counts once its
 * track exists (it is never "subscribed" to itself); a remote one is subscribed when this
 * client receives it.
 */
function readScreenShare(participant: Participant): ScreenShareFacts[] {
  const video = participant.getTrackPublication(Track.Source.ScreenShare);
  if (video === undefined) return [];
  const isLocal = participant.isLocal;
  if (isLocal && video.track === undefined) return [];
  return [
    {
      identity: participant.identity,
      isLocal,
      subscribed: isLocal || video.isSubscribed,
      hasAudio: participant.getTrackPublication(Track.Source.ScreenShareAudio) !== undefined,
    },
  ];
}
