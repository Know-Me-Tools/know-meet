// TJ-ARCH-MOB-001 compliant
// The "Video" section of the room's "Audio and video" pane (wc05 task 5.2, wc07 task 7.3):
// the Camera picker, the 16:9 self preview (mirrored; the `tile` fill with your initials
// and "Your camera is off" while it is off), then the Background section, placed under the
// preview so the preview shows the background being chosen. The preview is bound through
// the port and mounted only while the pane is open, so no extra video element runs while
// it is closed (shape section 8). A camera the browser blocked shows the reason instead of
// the picker. Scenario contract: km-settings-camera-select.
import type { RealtimeRoom } from "@know-meet/application";
import type { LocalParticipant } from "@know-meet/domain";
import type * as React from "react";
import { DEVICE_COPY, deviceBlocked } from "../../../guest-meeting/devices/device-copy";
import { DeviceField } from "../../../guest-meeting/devices/device-field";
import { initialsOf } from "../../../guest-meeting/participant-labels";
import { useMediaBinding } from "../use-media-binding";
import { sectionHeadingClass } from "./audio-section";
import type { RoomDevice } from "./use-room-device";

function SelfPreview({
  room,
  local,
}: {
  readonly room: RealtimeRoom;
  readonly local: LocalParticipant;
}) {
  const videoRef = useMediaBinding<HTMLVideoElement>(room, local.identity, "camera");
  const cameraOn = !local.camera.muted;
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-media-bg">
      <video
        ref={videoRef}
        aria-label={DEVICE_COPY.previewLabel}
        autoPlay
        muted
        playsInline
        hidden={!cameraOn}
        className="block size-full -scale-x-100 object-cover"
      />
      {cameraOn ? null : (
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-s2 bg-tile p-s4 text-center">
          <span
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-round bg-card font-display text-xl leading-none font-semibold text-foreground uppercase"
          >
            {initialsOf(local.displayName)}
          </span>
          <p className="text-sm text-muted-foreground">{DEVICE_COPY.cameraOff}</p>
        </div>
      )}
    </div>
  );
}

interface VideoSectionProps {
  readonly room: RealtimeRoom;
  readonly local: LocalParticipant | null;
  readonly camera: RoomDevice;
  readonly cameraBlocked: boolean;
  /** True while the pane is open: the preview runs only then. */
  readonly open: boolean;
  /** The Background section. */
  readonly children: React.ReactNode;
}

export function VideoSection({
  room,
  local,
  camera,
  cameraBlocked,
  open,
  children,
}: VideoSectionProps) {
  return (
    <section aria-labelledby="settings-video-heading" className="grid gap-s3">
      <h3 id="settings-video-heading" className={sectionHeadingClass}>
        {DEVICE_COPY.videoHeading}
      </h3>
      {cameraBlocked ? (
        <p className="text-sm text-foreground">{deviceBlocked("camera")}</p>
      ) : (
        <DeviceField
          id="settings-camera"
          testId="km-settings-camera-select"
          label="Camera"
          {...camera}
        />
      )}
      {open && local !== null ? <SelfPreview room={room} local={local} /> : null}
      {children}
    </section>
  );
}
