// TJ-ARCH-MOB-001 compliant
// Notices when the device in use is unplugged (device-settings shape, "Device unplugged"):
// the device watched at the previous render was in the previous device list and is not in
// the new one. Comparing against the previous render's id also catches an adapter that
// moves to another device in the same update that drops the old one. The callback gets
// the label the device had, because the new list no longer knows it. A device that is
// plugged in changes nothing here (no announcement).
import { type DeviceId, type DeviceKind, hasDevice, type MediaDevice } from "@know-meet/domain";
import { useEffect, useRef } from "react";
import { deviceLabel } from "./device-options";

interface Seen {
  readonly devices: readonly MediaDevice[];
  readonly watched: DeviceId | null;
}

export function useDeviceLoss(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
  watchedId: DeviceId | null,
  onLost: (lostLabel: string) => void,
): void {
  const previous = useRef<Seen>({ devices, watched: watchedId });
  const latest = useRef(onLost);
  useEffect(() => {
    latest.current = onLost;
  });

  useEffect(() => {
    const before = previous.current;
    previous.current = { devices, watched: watchedId };
    const lost = before.watched;
    if (lost === null || before.devices === devices) return;
    if (hasDevice(before.devices, kind, lost) && !hasDevice(devices, kind, lost)) {
      latest.current(deviceLabel(before.devices, kind, lost));
    }
  }, [devices, kind, watchedId]);
}
