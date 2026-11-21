import { type Room, RoomEvent } from "livekit-client";

export interface RoomEventHandlers {
  /** Participants, publications, subscriptions, mute state or devices in use changed. */
  readonly onChange: () => void;
  /** The SDK's connection state as its string value, e.g. `reconnecting`. */
  readonly onConnectionState: (sdkState: string) => void;
  /** The SDK ended the session (it emits this after its own teardown). */
  readonly onDisconnected: () => void;
  readonly onAudioPlayback: (playing: boolean) => void;
}

/** Room events that only mean "read the room again". */
const CHANGE_EVENTS = [
  RoomEvent.ParticipantConnected,
  RoomEvent.ParticipantDisconnected,
  RoomEvent.ParticipantNameChanged,
  RoomEvent.TrackPublished,
  RoomEvent.TrackUnpublished,
  RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackSubscriptionStatusChanged,
  RoomEvent.TrackMuted,
  RoomEvent.TrackUnmuted,
  // Local publish and unpublish, including a screen share the browser's own "Stop sharing"
  // bar ended: the SDK unpublishes a screen-share track when it ends.
  RoomEvent.LocalTrackPublished,
  RoomEvent.LocalTrackUnpublished,
  // A device switched (by us or by the SDK after the chosen device was unplugged).
  RoomEvent.ActiveDeviceChanged,
  RoomEvent.MediaDevicesChanged,
] as const;

/** Registers the handlers on `room` and returns the function that removes every one of them. */
export function bindRoomEvents(room: Room, handlers: RoomEventHandlers): () => void {
  const { onChange, onConnectionState, onDisconnected, onAudioPlayback } = handlers;
  room.on(RoomEvent.ConnectionStateChanged, onConnectionState);
  room.on(RoomEvent.Disconnected, onDisconnected);
  room.on(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback);
  for (const event of CHANGE_EVENTS) room.on(event, onChange);
  return () => {
    room.off(RoomEvent.ConnectionStateChanged, onConnectionState);
    room.off(RoomEvent.Disconnected, onDisconnected);
    room.off(RoomEvent.AudioPlaybackStatusChanged, onAudioPlayback);
    for (const event of CHANGE_EVENTS) room.off(event, onChange);
  };
}
