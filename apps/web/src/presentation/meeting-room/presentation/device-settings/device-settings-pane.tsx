// TJ-ARCH-MOB-001 compliant
// The room sheet's "Audio and video" pane (wc05 task 5.2, wc07 task 7.3; device-settings
// shape "Pane anatomy"): the head (title, "Only you see these settings.", Close), then
// Audio (Microphone, level meter, Speaker or the unsupported note, Play test sound) and
// Video (Camera, self preview, Background). Opening it moves focus to the title; Escape or
// Close returns focus to the Settings control (use-room-sheet). The self preview and the
// meter's own capture run only while the pane is open. A device in use that is unplugged
// falls back to the default and says so in a toast (which announces it politely).
// Focus order (DS-3): Close, Microphone, Speaker, Play test sound, Camera, Background.
import type { ConferencingUseCases, RealtimeRoom, RoomSnapshot } from "@know-meet/application";
import type { TrackKind } from "@know-meet/domain";
import { toast } from "@know-meet/ui/components/toast";
import { useCallback, useEffect } from "react";
import { DEVICE_COPY } from "../../../guest-meeting/devices/device-copy";
import { deviceOptions, hasDevicePermission } from "../../../guest-meeting/devices/device-options";
import type { Announce } from "../../../guest-meeting/live-status";
import { BackgroundSection } from "../background/background-section";
import { paneTitleId } from "../room-sheet/room-sheet";
import { RoomSheetPane } from "../room-sheet/room-sheet-pane";
import { AudioSection } from "./audio-section";
import { usePaneMicStream } from "./use-pane-mic-stream";
import { useRoomDevice } from "./use-room-device";
import { VideoSection } from "./video-section";

interface DeviceSettingsPaneProps {
  readonly room: RealtimeRoom;
  readonly snapshot: RoomSnapshot;
  readonly conferencing: ConferencingUseCases;
  readonly announce: Announce;
  /** Devices the browser refused at join (from the room URL). */
  readonly blockedAtJoin: readonly TrackKind[];
  /** Settings is the sheet's current pane (open or closing). */
  readonly shown: boolean;
  /** The sheet is open on this pane. */
  readonly active: boolean;
  readonly onClose: () => void;
}

export function DeviceSettingsPane({
  room,
  snapshot,
  conferencing,
  announce,
  blockedAtJoin,
  shown,
  active,
  onClose,
}: DeviceSettingsPaneProps) {
  const { devices, local, support } = snapshot;
  const notifyLost = useCallback((message: string) => {
    toast.add({ title: message });
  }, []);
  const microphone = useRoomDevice("microphone", devices, conferencing, announce, notifyLost);
  const camera = useRoomDevice("camera", devices, conferencing, announce, notifyLost);
  const speaker = useRoomDevice("speaker", devices, conferencing, announce, notifyLost);

  useEffect(() => {
    if (active) document.getElementById(paneTitleId("settings"))?.focus({ preventScroll: true });
  }, [active]);

  const blocked = (kind: TrackKind) =>
    blockedAtJoin.includes(kind) && !hasDevicePermission(devices.available, kind);
  const micBlocked = blocked("microphone");
  const cameraBlocked = blocked("camera");
  const micOn = local !== null && !local.microphone.muted;
  const cameraOn = local !== null && !local.camera.muted;
  const micStream = usePaneMicStream(active && micOn && !micBlocked, devices.active.microphone);
  const noCamera =
    cameraBlocked ||
    (hasDevicePermission(devices.available, "camera") &&
      deviceOptions(devices.available, "camera").length === 0);

  return (
    <RoomSheetPane
      pane="settings"
      shown={shown}
      title={DEVICE_COPY.paneTitle}
      lede={DEVICE_COPY.paneLede}
      closeLabel={DEVICE_COPY.paneClose}
      onClose={onClose}
      bodyLabel={DEVICE_COPY.paneBody}
    >
      <div className="grid gap-s5 pt-s2">
        <AudioSection
          microphone={microphone}
          speaker={speaker}
          speakerId={devices.active.speaker}
          support={support}
          micBlocked={micBlocked}
          micStream={micStream}
          micOn={micOn}
        />
        <VideoSection
          room={room}
          local={local}
          camera={camera}
          cameraBlocked={cameraBlocked}
          open={active}
        >
          <BackgroundSection
            state={snapshot.backgroundEffect}
            support={support.backgroundEffects}
            cameraOn={cameraOn}
            noCamera={noCamera}
            conferencing={conferencing}
            announce={announce}
          />
        </VideoSection>
      </div>
    </RoomSheetPane>
  );
}
