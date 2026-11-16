import { type Room, RoomEvent } from "livekit-client";

export interface RoomEventHandlers {
  /** Participants, publications, subscriptions or mute state changed. */
  readonly onChange: () => void;
  /** The SDK's connection state as its string value, e.g. `reconnecting`. */
  readonly onConnectionState: (sdkState: string) => void;
  /** The SDK ended the session (it emits this after its own teardown). */
  readonly onDisconnected: () => void;
  readonly onAudioPlayback: (playing: boolean) => void;
}

/** Registers the handlers on `room` and returns the function that removes every one of them. */
export function bindRoomEvents(room: Room, handlers: RoomEventHandlers): () => void {
  const { onChange, onConnectionState, onDisconnected, onAudioPlayback } = handlers;
  room.on(RoomEvent.ConnectionStateChanged, onConnectionState);
  room.on(RoomEvent.Disconnected, onDisconnected);
  room.on(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback);
  room.on(RoomEvent.ParticipantConnected, onChange);
  room.on(RoomEvent.ParticipantDisconnected, onChange);
  room.on(RoomEvent.ParticipantNameChanged, onChange);
  room.on(RoomEvent.TrackPublished, onChange);
  room.on(RoomEvent.TrackUnpublished, onChange);
  room.on(RoomEvent.TrackSubscribed, onChange);
  room.on(RoomEvent.TrackUnsubscribed, onChange);
  room.on(RoomEvent.TrackSubscriptionStatusChanged, onChange);
  room.on(RoomEvent.TrackMuted, onChange);
  room.on(RoomEvent.TrackUnmuted, onChange);
  room.on(RoomEvent.LocalTrackPublished, onChange);
  room.on(RoomEvent.LocalTrackUnpublished, onChange);
  return () => {
    room.off(RoomEvent.ConnectionStateChanged, onConnectionState);
    room.off(RoomEvent.Disconnected, onDisconnected);
    room.off(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback);
    room.off(RoomEvent.ParticipantConnected, onChange);
    room.off(RoomEvent.ParticipantDisconnected, onChange);
    room.off(RoomEvent.ParticipantNameChanged, onChange);
    room.off(RoomEvent.TrackPublished, onChange);
    room.off(RoomEvent.TrackUnpublished, onChange);
    room.off(RoomEvent.TrackSubscribed, onChange);
    room.off(RoomEvent.TrackUnsubscribed, onChange);
    room.off(RoomEvent.TrackSubscriptionStatusChanged, onChange);
    room.off(RoomEvent.TrackMuted, onChange);
    room.off(RoomEvent.TrackUnmuted, onChange);
    room.off(RoomEvent.LocalTrackPublished, onChange);
    room.off(RoomEvent.LocalTrackUnpublished, onChange);
  };
}
