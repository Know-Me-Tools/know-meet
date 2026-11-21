import type { ScreenShareError } from "@know-meet/application";
import {
  type ConferencingSupport,
  conferencingErrors,
  err,
  meetingErrors,
  ok,
  type Result,
} from "@know-meet/domain";
import type { ScreenShareCaptureOptions } from "livekit-client";
import { errorName, mapScreenShareError } from "../../domain/error-mapping.ts";
import type { SessionHost } from "./session-host.ts";

/**
 * The browser's own picker, with no surface restriction (port contract): screen, window or
 * tab, the current tab included, switching allowed, and tab or system audio where the browser
 * offers it (Chromium only; Firefox and WebKit return video alone). Resolution stays at the
 * SDK default (1080p30, uncapped on Safari 17).
 */
const SHARE_OPTIONS: ScreenShareCaptureOptions = {
  audio: true,
  selfBrowserSurface: "include",
  surfaceSwitching: "include",
  systemAudio: "include",
};

export type SetScreenShareEnabled = (enabled: boolean) => Promise<Result<void, ScreenShareError>>;

/**
 * The port's `setScreenShareEnabled` (WC-1). Stopping unpublishes the video and its audio
 * (a screen share cannot be muted). When the browser ends the share itself (its "Stop
 * sharing" bar, or the shared window closing), the SDK unpublishes the ended tracks and the
 * `LocalTrackUnpublished` refresh removes the share from the snapshot, exactly as a stop does.
 */
export function createSetScreenShareEnabled(
  host: SessionHost,
  support: ConferencingSupport,
): SetScreenShareEnabled {
  return async (enabled) => {
    const active = host.joined();
    if (active === null) return err(meetingErrors.connectionLost());
    if (enabled && support.screenShare === "unsupported") {
      return err(conferencingErrors.unsupported("screenShare"));
    }
    try {
      await active.room.localParticipant.setScreenShareEnabled(enabled, SHARE_OPTIONS);
    } catch (error) {
      host.report({ type: "screen-share-failed", errorName: errorName(error) });
      if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
      host.refresh();
      return err(mapScreenShareError(error));
    }
    if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
    host.refresh();
    return ok(undefined);
  };
}
