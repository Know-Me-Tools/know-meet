// TJ-ARCH-MOB-001 compliant
// What a device select lists and shows, derived from the room's device list (no React, no
// browser calls). Option values are the browser's device ids (scenario contract WC-5, WC-6).
// The entry the browser marks as the system default reads "Default (<label>)", or "System
// default" when the browser gives no label (device-settings shape, section 7).
import {
  type DeviceId,
  type DeviceKind,
  devicesOfKind,
  hasDevice,
  type MediaDevice,
} from "@know-meet/domain";

export interface DeviceOption {
  readonly value: DeviceId;
  readonly label: string;
}

export const DEVICE_NOUN: Readonly<Record<DeviceKind, string>> = {
  microphone: "Microphone",
  camera: "Camera",
  speaker: "Speaker",
};

/** Chrome prefixes its default entry ("Default - Built-in Microphone"); the option adds its own. */
const BROWSER_DEFAULT_PREFIX = /^default\s*[-–:]\s*/i;

function optionLabel(device: MediaDevice, position: number): string {
  const label = device.label.replace(BROWSER_DEFAULT_PREFIX, "").trim();
  if (device.isDefault) return label === "" ? "System default" : `Default (${label})`;
  return label === "" ? `${DEVICE_NOUN[device.kind]} ${position}` : label;
}

export function deviceOptions(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
): readonly DeviceOption[] {
  return devicesOfKind(devices, kind).map((device, index) => ({
    value: device.id,
    label: optionLabel(device, index + 1),
  }));
}

/** Labels appear only once the site may use that kind of device. */
export function hasDevicePermission(devices: readonly MediaDevice[], kind: DeviceKind): boolean {
  return devicesOfKind(devices, kind).some((device) => device.label !== "");
}

/** The entry the browser marks as default, else the first it lists (the browser's own default). */
export function defaultDevice(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
): MediaDevice | null {
  const ofKind = devicesOfKind(devices, kind);
  return ofKind.find((device) => device.isDefault) ?? ofKind[0] ?? null;
}

/**
 * The value a select shows: the chosen or active device while it is listed, otherwise the
 * default (a device that was unplugged falls back). Empty when nothing is listed.
 */
export function shownDeviceId(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
  id: DeviceId | null,
): DeviceId | "" {
  if (id !== null && hasDevice(devices, kind, id)) return id;
  return defaultDevice(devices, kind)?.id ?? "";
}

/** The label people read for a device id, as its option shows it. */
export function deviceLabel(devices: readonly MediaDevice[], kind: DeviceKind, id: string): string {
  const option = deviceOptions(devices, kind).find((candidate) => candidate.value === id);
  return option?.label ?? DEVICE_NOUN[kind].toLowerCase();
}

/** Narrows a select's value to one of its listed device ids. */
export function listedDeviceId(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
  value: string,
): DeviceId | null {
  const device = devicesOfKind(devices, kind).find((candidate) => candidate.id === value);
  return device?.id ?? null;
}
