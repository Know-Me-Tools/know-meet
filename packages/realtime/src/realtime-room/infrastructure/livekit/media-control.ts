import type { MediaError } from "@know-meet/application";
import {
  type ActiveDevices,
  err,
  meetingErrors,
  ok,
  type Result,
  type TrackKind,
} from "@know-meet/domain";
import { type Room, Track } from "livekit-client";
import { browserKindOf } from "../../domain/device-mapping.ts";
import { errorName, mapMediaError } from "../../domain/error-mapping.ts";
import type { DeviceCatalog } from "../browser/device-catalog.ts";
import type { SessionHost } from "./session-host.ts";

/**
 * Turns the local microphone or camera on or off. The first enable asks the browser for the
 * device and publishes the track; later calls mute or unmute it. A refused device rejects with
 * the getUserMedia error (for example `NotAllowedError`) and leaves the room connected.
 * Muting the camera stops the device, so the camera light goes off; muting the microphone
 * keeps the device open (SDK default `stopMicTrackOnMute: false`). The device used is the
 * room's capture default (the lobby choice) or the one `selectDevice` switched to.
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

/** The deviceId the published microphone or camera track actually opened, or null. */
function openedDeviceId(room: Room, kind: TrackKind): string | null {
  const source = kind === "microphone" ? Track.Source.Microphone : Track.Source.Camera;
  const track = room.localParticipant.getTrackPublication(source)?.track;
  return track?.mediaStreamTrack.getSettings().deviceId ?? null;
}

/**
 * WC-5: the capture default asks for the lobby choice as `ideal`, and Chromium can open its
 * "default" audio alias instead. When the opened device is not the requested one, switch to
 * the requested id `exact` (the call `selectDevice` uses). A failed switch keeps the device
 * that opened and is reported; the enable itself still succeeded.
 */
async function enforceRequestedDevice(
  room: Room,
  kind: TrackKind,
  wanted: string | null,
): Promise<void> {
  if (wanted === null) return;
  const opened = openedDeviceId(room, kind);
  if (opened === null || opened === wanted) return;
  await room.switchActiveDevice(browserKindOf(kind), wanted, true);
}

export type SetMediaEnabled = (
  kind: TrackKind,
  enabled: boolean,
) => Promise<Result<void, MediaError>>;

/**
 * The port's `setMediaEnabled`. After a successful enable the device list is read again,
 * because the browser reveals device labels once the site has permission.
 */
export function createSetMediaEnabled(
  host: SessionHost,
  catalog: DeviceCatalog,
  requested: () => ActiveDevices,
): SetMediaEnabled {
  return async (kind, enabled) => {
    const active = host.joined();
    if (active === null) return err(meetingErrors.connectionLost());
    try {
      await setLocalMediaEnabled(active.room, kind, enabled);
    } catch (error) {
      host.report({ type: "media-failed", kind, errorName: errorName(error) });
      if (host.isCurrent(active)) host.refresh();
      return err(mapMediaError(error, kind));
    }
    if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
    if (enabled) {
      try {
        await enforceRequestedDevice(active.room, kind, requested()[kind]);
      } catch (error) {
        host.report({ type: "device-switch-failed", kind, errorName: errorName(error) });
      }
      if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
    }
    host.refresh();
    if (enabled) void catalog.refresh();
    return ok(undefined);
  };
}
