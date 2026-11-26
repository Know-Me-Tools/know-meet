import type { TranscriptionRoster, TranscriptionSource } from "@know-meet/domain";
import { type Room, RoomEvent, Track } from "livekit-client";

interface ObservedSpeechSource extends TranscriptionSource {
  readonly track: MediaStreamTrack;
  readonly displayName: string | null;
}

export interface LocalSpeechRoomFacts {
  readonly roster: TranscriptionRoster;
  readonly localSessionId: string;
  readonly audio: readonly ObservedSpeechSource[];
}

interface ObserveLocalSpeechRoomOptions {
  readonly room: Room;
  /** Caller creates this per actual authenticated room connection. */
  readonly id: () => string;
  /** Capability answers are purpose-version-specific and transport attested. */
  readonly supportsConsent: (sessionId: string) => boolean;
  /** Null is a synchronous cut. Positive snapshots are delivered only when stable. */
  readonly change: (facts: LocalSpeechRoomFacts | null) => void;
}

const SOURCE_EVENTS = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.TrackPublished,
  RoomEvent.TrackUnpublished,
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackSubscriptionStatusChanged,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  RoomEvent.ActiveDeviceChanged,
] as const;

const CONNECTION_EVENTS = [
  RoomEvent.ConnectionStateChanged,
  RoomEvent.SignalReconnecting,
  RoomEvent.Reconnecting,
  RoomEvent.Reconnected,
  RoomEvent.Disconnected,
] as const;

/**
 * This is not the meeting playback track resolver. It observes existing
 * microphone tracks (including the authorized local one); does not clone,
 * enable, publish, obtain audio, load a model or listen for shared content.
 */
export function observeLocalSpeechRoom(options: ObserveLocalSpeechRoomOptions) {
  const { room, change } = options;
  const trackIds = new WeakMap<MediaStreamTrack, string>();
  let stopped = false;
  let scheduled = false;
  let revision = 0;
  let epoch: string | null = null;
  let trackSequence = 0;

  const snapshot = (): LocalSpeechRoomFacts | null => {
    if (room.state !== "connected") return null;
    epoch ??= options.id();
    const localSessionId = room.localParticipant.sid;
    const participants = [room.localParticipant, ...room.remoteParticipants.values()];
    const participantSessionIds = participants.map((candidate) => candidate.sid).sort();
    if (
      epoch === "" ||
      localSessionId === "" ||
      participantSessionIds.includes("") ||
      new Set(participantSessionIds).size !== participants.length
    )
      return null;
    const audio: ObservedSpeechSource[] = [];
    for (const participant of participants) {
      const publication = participant.getTrackPublication(Track.Source.Microphone);
      const track = publication?.track?.mediaStreamTrack;
      if (
        publication?.isMuted !== false ||
        track === undefined ||
        track.kind !== "audio" ||
        track.readyState !== "live" ||
        !track.enabled
      )
        continue;
      let id = trackIds.get(track);
      if (id === undefined) {
        id = `track-${++trackSequence}`;
        trackIds.set(track, id);
      }
      audio.push({
        participantSessionId: participant.sid,
        trackInstanceId: id,
        track,
        displayName: participant.name?.trim().slice(0, 80) || null,
      });
    }
    return {
      localSessionId,
      roster: {
        roomEpoch: epoch,
        revision: ++revision,
        participantSessionIds,
        sources: audio.map(({ participantSessionId, trackInstanceId }) => ({
          participantSessionId,
          trackInstanceId,
        })),
        canAskEveryone: participantSessionIds.every(
          (sid) => sid === localSessionId || options.supportsConsent(sid),
        ),
      },
      audio,
    };
  };

  const refreshed = () => {
    if (stopped) return;
    // An SDK event can precede the final collection update. Cut before
    // yielding; reread the SDK in a later microtask.
    change(null);
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!stopped) change(snapshot());
    });
  };
  const changedConnection = () => {
    epoch = null;
    refreshed();
  };
  for (const event of SOURCE_EVENTS) room.on(event, refreshed);
  for (const event of CONNECTION_EVENTS) room.on(event, changedConnection);
  refreshed();

  return {
    /** Only call if a newly attested capability changed the actual snapshot. */
    refreshCapabilities: refreshed,
    close() {
      if (stopped) return;
      stopped = true;
      for (const event of SOURCE_EVENTS) room.off(event, refreshed);
      for (const event of CONNECTION_EVENTS) room.off(event, changedConnection);
      change(null);
    },
  };
}
