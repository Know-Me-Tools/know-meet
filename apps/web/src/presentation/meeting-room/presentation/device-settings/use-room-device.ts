// TJ-ARCH-MOB-001 compliant
// One room device picker's state (wc05 task 5.2; device-settings shape, room column of
// "States"). A change switches through the conferencing use case at once; the select shows
// the requested device while the switch runs (the published track keeps its last frame),
// then whatever the room reports. Success is announced politely ("Microphone changed to
// <label>."); a refusal returns the select to the device in use and sets the error line.
// The device in use being unplugged falls back to the default (the adapter switches) and
// is reported through `onLost`, which the pane shows as a toast.
import type { ConferencingUseCases, DeviceState } from "@know-meet/application";
import type { DeviceId, DeviceKind } from "@know-meet/domain";
import { useCallback, useState } from "react";
import {
  DEVICE_COPY,
  deviceChanged,
  deviceDisconnected,
  noDeviceOption,
  placeholderOption,
  switchFailed,
} from "../../../guest-meeting/devices/device-copy";
import type { DeviceFieldMode } from "../../../guest-meeting/devices/device-field";
import {
  type DeviceOption,
  deviceLabel,
  deviceOptions,
  hasDevicePermission,
  listedDeviceId,
  shownDeviceId,
} from "../../../guest-meeting/devices/device-options";
import { useDeviceLoss } from "../../../guest-meeting/devices/use-device-loss";
import type { Announce } from "../../../guest-meeting/live-status";

export interface RoomDevice {
  readonly mode: DeviceFieldMode;
  readonly options: readonly DeviceOption[];
  readonly value: string;
  readonly emptyOption: string;
  readonly hint: string | null;
  readonly error: string | null;
  readonly onChange: (value: string) => void;
}

interface Switching {
  readonly requested: DeviceId | null;
  readonly error: string | null;
}

const IDLE: Switching = { requested: null, error: null };

function modeOf(devices: DeviceState, kind: DeviceKind): DeviceFieldMode {
  if (!hasDevicePermission(devices.available, kind)) return "locked";
  return deviceOptions(devices.available, kind).length === 0 ? "none" : "ready";
}

export function useRoomDevice(
  kind: DeviceKind,
  devices: DeviceState,
  conferencing: ConferencingUseCases,
  announce: Announce,
  onLost: (message: string) => void,
): RoomDevice {
  const { available, active } = devices;
  const [switching, setSwitching] = useState<Switching>(IDLE);
  const value = shownDeviceId(available, kind, switching.requested ?? active[kind]);

  useDeviceLoss(available, kind, active[kind], (lostLabel) => {
    const fallback = deviceLabel(available, kind, shownDeviceId(available, kind, null));
    onLost(deviceDisconnected(lostLabel, fallback));
  });

  const onChange = useCallback(
    (next: string) => {
      const id = listedDeviceId(available, kind, next);
      if (id === null || id === value) return;
      const label = deviceLabel(available, kind, id);
      setSwitching({ requested: id, error: null });
      void conferencing.selectDevice(kind, id).then((result) => {
        if (result.ok) {
          setSwitching(IDLE);
          announce(deviceChanged(kind, label));
          return;
        }
        setSwitching({ requested: null, error: switchFailed(label, result.error) });
      });
    },
    [available, kind, value, conferencing, announce],
  );

  const mode = modeOf(devices, kind);
  return {
    mode,
    options: deviceOptions(available, kind),
    value,
    emptyOption: mode === "none" ? noDeviceOption(kind) : placeholderOption(kind),
    hint:
      mode === "locked"
        ? DEVICE_COPY.permissionHint
        : mode === "none"
          ? DEVICE_COPY.noDeviceHint
          : null,
    error: switching.error,
    onChange,
  };
}
