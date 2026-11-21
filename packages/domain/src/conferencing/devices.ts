import type { TrackKind } from "../meeting/participant.ts";

/**
 * The devices a participant can choose: the two inputs a guest sends (`TrackKind`) and the
 * speaker that plays the room. Each maps to one browser `MediaDeviceKind`.
 */
export type DeviceKind = TrackKind | "speaker";

export const DEVICE_KINDS: readonly DeviceKind[] = ["microphone", "camera", "speaker"];

/** Opaque browser device id. Valid only on this device and origin. */
export type DeviceId = string & { readonly __brand: "DeviceId" };

/** Ids are opaque browser values: this only marks a string as one. Empty is not an id. */
export function toDeviceId(value: string): DeviceId | null {
  return value.length === 0 ? null : (value as DeviceId);
}

/** One device the browser reports. */
export interface MediaDevice {
  readonly kind: DeviceKind;
  readonly id: DeviceId;
  /** The browser's label. Empty until the site has permission for that kind of device. */
  readonly label: string;
  /** True for the entry the browser marks as the system default. */
  readonly isDefault: boolean;
}

/**
 * The inputs chosen in the lobby and carried into the room (WC-5). `null` means the
 * system default, which is also what a fresh profile gets (WC-5 negative control).
 * The speaker is chosen only in the room (device-settings shape, assumption).
 */
export interface DeviceChoice {
  readonly microphone: DeviceId | null;
  readonly camera: DeviceId | null;
}

export const DEFAULT_DEVICE_CHOICE: DeviceChoice = { microphone: null, camera: null };

/** The device each kind is using now; `null` means the system default. */
export interface ActiveDevices {
  readonly microphone: DeviceId | null;
  readonly camera: DeviceId | null;
  readonly speaker: DeviceId | null;
}

export const DEFAULT_ACTIVE_DEVICES: ActiveDevices = {
  microphone: null,
  camera: null,
  speaker: null,
};

/** Devices of one kind, in the order the browser listed them. */
export function devicesOfKind(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
): readonly MediaDevice[] {
  return devices.filter((device) => device.kind === kind);
}

/** True when the id is among the listed devices of that kind. */
export function hasDevice(
  devices: readonly MediaDevice[],
  kind: DeviceKind,
  id: DeviceId,
): boolean {
  return devices.some((device) => device.kind === kind && device.id === id);
}
