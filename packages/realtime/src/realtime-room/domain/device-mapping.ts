import {
  type ActiveDevices,
  type DeviceChoice,
  type DeviceKind,
  type MediaDevice,
  toDeviceId,
} from "@know-meet/domain";

/** The fields read from a browser `MediaDeviceInfo`. */
export interface DeviceInfoFacts {
  readonly kind: string;
  readonly deviceId: string;
  readonly label: string;
}

export const NO_DEVICES: readonly MediaDevice[] = [];

/** The browser's `MediaDeviceKind` for one of ours. */
export function browserKindOf(kind: DeviceKind): MediaDeviceKind {
  switch (kind) {
    case "microphone":
      return "audioinput";
    case "camera":
      return "videoinput";
    case "speaker":
      return "audiooutput";
  }
}

function deviceKindOf(browserKind: string): DeviceKind | null {
  switch (browserKind) {
    case "audioinput":
      return "microphone";
    case "videoinput":
      return "camera";
    case "audiooutput":
      return "speaker";
    default:
      return null;
  }
}

/**
 * The browser list as domain devices, in browser order. Entries without an id (what a browser
 * reports before the site has permission) are left out. The browser lists the system default
 * of each kind first (Media Capture spec), so the first entry per kind is `isDefault`.
 */
export function toMediaDevices(infos: readonly DeviceInfoFacts[]): readonly MediaDevice[] {
  const seen = new Set<DeviceKind>();
  const devices: MediaDevice[] = [];
  for (const info of infos) {
    const kind = deviceKindOf(info.kind);
    const id = toDeviceId(info.deviceId);
    if (kind === null || id === null) continue;
    devices.push({ kind, id, label: info.label, isDefault: !seen.has(kind) });
    seen.add(kind);
  }
  return devices.length === 0 ? NO_DEVICES : devices;
}

export function sameDevices(a: readonly MediaDevice[], b: readonly MediaDevice[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((device, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      device.kind === other.kind &&
      device.id === other.id &&
      device.label === other.label &&
      device.isDefault === other.isDefault
    );
  });
}

export function sameActiveDevices(a: ActiveDevices, b: ActiveDevices): boolean {
  return a.microphone === b.microphone && a.camera === b.camera && a.speaker === b.speaker;
}

/** The lobby choice as the devices requested for a new session; the speaker stays as it was. */
export function requestedFromChoice(choice: DeviceChoice, previous: ActiveDevices): ActiveDevices {
  return { microphone: choice.microphone, camera: choice.camera, speaker: previous.speaker };
}

/**
 * What each kind uses now: the device the SDK reports in use, else the one requested (or
 * `null`, the system default). `inUse` returns the SDK's id for a browser kind, if any.
 */
export function activeDevicesFrom(
  inUse: (kind: MediaDeviceKind) => string | undefined,
  requested: ActiveDevices,
): ActiveDevices {
  const read = (kind: DeviceKind) =>
    toDeviceId(inUse(browserKindOf(kind)) ?? "") ?? requested[kind];
  return { microphone: read("microphone"), camera: read("camera"), speaker: read("speaker") };
}
