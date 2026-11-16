import type { ConnectionState } from "@know-meet/domain";
import { type Participant, type Room, Track } from "livekit-client";
import {
  type ParticipantFacts,
  type RoomFacts,
  type TrackFacts,
  UNPUBLISHED,
} from "../snapshot-mapping.ts";

/** Reads the SDK room into plain facts. `room` is null before connecting and after leaving. */
export function readRoomFacts(room: Room | null, connection: ConnectionState): RoomFacts {
  if (room === null) return { connection, local: null, remotes: [] };
  return {
    connection,
    local: readParticipant(room.localParticipant),
    // `remoteParticipants` is a Map keyed by identity; its iteration order is insertion order.
    remotes: [...room.remoteParticipants.values()].map(readParticipant),
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
