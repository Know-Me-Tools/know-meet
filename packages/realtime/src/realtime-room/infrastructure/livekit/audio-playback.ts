import type { AudioStartError } from "@know-meet/application";
import { conferencingErrors, err, meetingErrors, ok, type Result } from "@know-meet/domain";
import type { Room } from "livekit-client";
import type { SessionHost } from "./session-host.ts";

export type StartAudio = () => Promise<Result<void, AudioStartError>>;

/**
 * The port's `startAudio` (WC-12), for the "Enable audio" click. The SDK call is made
 * synchronously, before any await, so it runs inside the click's user activation. The
 * snapshot's `audioPlayback` follows the SDK's `canPlaybackAudio`, which turns false when an
 * attached element's `play()` is refused and true again once this succeeds.
 */
export function createStartAudio(host: SessionHost): StartAudio {
  return async () => {
    const active = host.joined();
    if (active === null) return err(meetingErrors.connectionLost());
    const started = active.room.startAudio();
    try {
      await started;
    } catch {
      // The SDK has already reported the failure through AudioPlaybackStatusChanged.
      if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
      host.refresh();
      return err(conferencingErrors.playbackBlocked());
    }
    if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
    host.refresh();
    return active.room.canPlaybackAudio ? ok(undefined) : err(conferencingErrors.playbackBlocked());
  };
}

/**
 * Right after joining, which starts from a click: plays remote audio under that click's
 * sticky activation. If the browser still blocks it, the snapshot shows `blocked` and the
 * page offers "Enable audio".
 */
export function startAudioAfterJoin(room: Room, host: SessionHost): void {
  void room.startAudio().catch(() => {
    host.report({ type: "audio-playback", playing: false });
    host.scheduleRefresh();
  });
}
