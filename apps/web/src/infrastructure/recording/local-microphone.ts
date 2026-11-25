// TJ-ARCH-MOB-001 compliant
import type { RoomSnapshot } from "@know-meet/application";
import type { AudioMixer } from "./audio-mixer";

/** Opens the microphone the participant is using. Null when it cannot be opened. */
export type CaptureMicrophone = (deviceId: string | null) => Promise<MediaStream | null>;

/**
 * The default capture: a second reading of the microphone the person already allowed. It
 * needs no permission prompt because the room opened the same device. Echo cancelling
 * stays on, so the recording holds this person's voice and not the room's.
 */
export const captureMicrophoneFromBrowser: CaptureMicrophone = async (deviceId) => {
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") return null;
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio:
        deviceId === null
          ? { echoCancellation: true, noiseSuppression: true }
          : { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
      video: false,
    });
  } catch {
    return null;
  }
};

export interface LocalMicrophoneFeed {
  /** Follows the snapshot: the chosen device, and silence while the participant is muted. */
  sync(snapshot: RoomSnapshot, eligible: boolean, admitted?: boolean): Promise<void>;
  dispose(): void;
}

export const LOCAL_MICROPHONE_KEY = "microphone:local";

/**
 * Feeds the participant's own voice into the mix. `attachMedia` never returns the local
 * microphone (nobody should hear themselves), so it is captured here instead. Muting in the
 * room sets this source's gain to zero; the capture stays open so unmuting is instant.
 * Changing the room's microphone re-captures that device.
 */
export function createLocalMicrophoneFeed(
  mixer: AudioMixer,
  capture: CaptureMicrophone,
): LocalMicrophoneFeed {
  let stream: MediaStream | null = null;
  let device: string | null | undefined;
  let attempt = 0;
  let muted = false;
  let admitted = false;
  let disposed = false;
  let acquiring = Promise.resolve();

  const release = (): void => {
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
  };

  const apply = (): void =>
    mixer.setSource(LOCAL_MICROPHONE_KEY, admitted ? stream : null, muted ? 0 : 1);

  return {
    sync: (snapshot, eligible, live = true) => {
      if (disposed) return Promise.resolve();
      admitted = live;
      if (!eligible) {
        attempt += 1;
        device = undefined;
        release();
        apply();
        return Promise.resolve();
      }
      muted = snapshot.local?.microphone.muted ?? true;
      const wanted = snapshot.devices.active.microphone;
      if (wanted === device) {
        apply();
        return acquiring;
      }
      release();
      apply();
      device = wanted;
      attempt += 1;
      const mine = attempt;
      acquiring = capture(wanted).then((next) => {
        if (disposed || mine !== attempt) {
          for (const track of next?.getTracks() ?? []) track.stop();
          return;
        }
        release();
        stream = next;
        apply();
      });
      return acquiring;
    },
    dispose: () => {
      disposed = true;
      attempt += 1;
      release();
      mixer.setSource(LOCAL_MICROPHONE_KEY, null, 0);
    },
  };
}
