// TJ-ARCH-MOB-001 compliant
// The lobby's Microphone and Camera pickers (wc05 task 5.1; device-settings shape, lobby
// column of "States"). Before permission the picker is locked (aria-disabled, described by
// "Allow camera and microphone to choose a device."); a kind the browser blocked shows no
// picker, the lobby error card says why; no device of a kind shows "No <kind> found". A
// picker stays usable while its device is toggled off (the choice applies when it is turned
// on). A switch the browser refuses returns to the previous device with the error line. An
// unplugged choice falls back to the default and says so politely.
// Scenario contract: km-lobby-mic-select, km-lobby-camera-select.
import type { MediaDevice, TrackKind } from "@know-meet/domain";
import {
  DEVICE_COPY,
  deviceChanged,
  deviceDisconnected,
  noDeviceOption,
  placeholderOption,
  switchFailed,
} from "../../guest-meeting/devices/device-copy";
import { DeviceField, type DeviceFieldMode } from "../../guest-meeting/devices/device-field";
import {
  DEVICE_NOUN,
  deviceLabel,
  deviceOptions,
  hasDevicePermission,
  listedDeviceId,
  shownDeviceId,
} from "../../guest-meeting/devices/device-options";
import { useDeviceLoss } from "../../guest-meeting/devices/use-device-loss";
import type { Announce } from "../../guest-meeting/live-status";
import type { DevicePreview } from "./use-device-preview";

const TEST_IDS: Readonly<Record<TrackKind, string>> = {
  microphone: "km-lobby-mic-select",
  camera: "km-lobby-camera-select",
};

interface LobbyDeviceFieldProps {
  readonly kind: TrackKind;
  readonly devices: readonly MediaDevice[];
  readonly preview: DevicePreview;
  readonly announce: Announce;
}

function modeOf(
  devices: readonly MediaDevice[],
  kind: TrackKind,
  preview: DevicePreview,
): DeviceFieldMode {
  if (!hasDevicePermission(devices, kind)) {
    return preview.problems[kind] === "missing" ? "none" : "locked";
  }
  return deviceOptions(devices, kind).length === 0 ? "none" : "ready";
}

export function LobbyDeviceField({ kind, devices, preview, announce }: LobbyDeviceFieldProps) {
  const chosen = preview.choice[kind];
  useDeviceLoss(devices, kind, chosen, (lostLabel) => {
    preview.fallBack(kind);
    const fallback = deviceLabel(devices, kind, shownDeviceId(devices, kind, null));
    announce(deviceDisconnected(lostLabel, fallback));
  });

  // A blocked device has no picker: the lobby error card is the only message
  // (shape, "Permission denied").
  if (preview.problems[kind] === "blocked") return null;

  const mode = modeOf(devices, kind, preview);
  const failedId = preview.switchFailures[kind];
  const hint =
    mode === "locked"
      ? DEVICE_COPY.permissionHint
      : mode === "none"
        ? DEVICE_COPY.noDeviceHint
        : null;

  return (
    <DeviceField
      id={`lobby-${kind}-device`}
      testId={TEST_IDS[kind]}
      label={DEVICE_NOUN[kind]}
      mode={mode}
      options={deviceOptions(devices, kind)}
      value={shownDeviceId(devices, kind, chosen)}
      emptyOption={mode === "none" ? noDeviceOption(kind) : placeholderOption(kind)}
      hint={hint}
      error={failedId === null ? null : switchFailed(deviceLabel(devices, kind, failedId))}
      onChange={(value) => {
        const id = listedDeviceId(devices, kind, value);
        if (id === null) return;
        preview.choose(kind, id);
        // A device that is off opens nothing now, so its change is confirmed at once.
        if (!preview.wishes[kind]) announce(deviceChanged(kind, deviceLabel(devices, kind, id)));
      }}
    />
  );
}
