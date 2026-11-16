import type { TrackKind } from "@know-meet/domain";
import type { Room } from "livekit-client";

/**
 * Turns the local microphone or camera on or off. The first enable asks the browser for the
 * device and publishes the track; later calls mute or unmute it. A refused device rejects with
 * the getUserMedia error (for example `NotAllowedError`) and leaves the room connected.
 * Muting the camera stops the device, so the camera light goes off; muting the microphone
 * keeps the device open (SDK default `stopMicTrackOnMute: false`).
 */
export async function setLocalMediaEnabled(
  room: Room,
  kind: TrackKind,
  enabled: boolean,
): Promise<void> {
  if (kind === "microphone") {
    await room.localParticipant.setMicrophoneEnabled(enabled);
    return;
  }
  await room.localParticipant.setCameraEnabled(enabled);
}
