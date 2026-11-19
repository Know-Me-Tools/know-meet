import type { DeviceError } from "@know-meet/application";
import {
  type ActiveDevices,
  type ConferencingSupport,
  conferencingErrors,
  DEFAULT_ACTIVE_DEVICES,
  type DeviceChoice,
  type DeviceId,
  type DeviceKind,
  err,
  hasDevice,
  meetingErrors,
  ok,
  type Result,
} from "@know-meet/domain";
import type { RoomOptions } from "livekit-client";
import { browserKindOf, requestedFromChoice } from "../../domain/device-mapping.ts";
import { errorName, mapDeviceSwitchError } from "../../domain/error-mapping.ts";
import type { DeviceCatalog } from "../browser/device-catalog.ts";
import type { SessionHost } from "./session-host.ts";

/** Device choice and switching (WC-5, WC-6). The list itself comes from the page's catalog. */
export interface Devices {
  /** What was asked for: the lobby choice, then each `selectDevice`. */
  requested(): ActiveDevices;
  /**
   * Room options for a new session with the lobby's choice as capture defaults. The id is
   * `ideal`, not `exact`: a device unplugged since the lobby falls back to the system default
   * instead of failing (port contract), and the SDK reports the device it actually opened.
   */
  roomOptionsFor(base: RoomOptions, choice: DeviceChoice): RoomOptions;
  refreshDevices(): Promise<void>;
  selectDevice(kind: DeviceKind, id: DeviceId): Promise<Result<void, DeviceError>>;
}

export function createDevices(
  host: SessionHost,
  catalog: DeviceCatalog,
  support: ConferencingSupport,
): Devices {
  let requested: ActiveDevices = DEFAULT_ACTIVE_DEVICES;

  const roomOptionsFor = (base: RoomOptions, choice: DeviceChoice): RoomOptions => {
    requested = requestedFromChoice(choice, requested);
    return {
      ...base,
      ...(choice.microphone !== null
        ? { audioCaptureDefaults: { deviceId: { ideal: choice.microphone } } }
        : {}),
      ...(choice.camera !== null
        ? { videoCaptureDefaults: { deviceId: { ideal: choice.camera } } }
        : {}),
      ...(requested.speaker !== null ? { audioOutput: { deviceId: requested.speaker } } : {}),
    };
  };

  /**
   * Speaker selection is never attempted without support (the SDK throws there). A listed
   * input is opened `exact`, so a device unplugged since the list was read fails as
   * device-not-found rather than silently using another one. With the device off, the switch
   * only changes what the next enable opens; with it on, the published track continues on the
   * new device and keeps its processor (the SDK restarts both in place).
   */
  const selectDevice = async (
    kind: DeviceKind,
    id: DeviceId,
  ): Promise<Result<void, DeviceError>> => {
    const active = host.joined();
    if (active === null) return err(meetingErrors.connectionLost());
    if (kind === "speaker" && support.speakerSelection === "unsupported") {
      return err(conferencingErrors.unsupported("speakerSelection"));
    }
    if (!hasDevice(catalog.current(), kind, id)) {
      return err(conferencingErrors.deviceNotFound(kind));
    }
    try {
      // The boolean it resolves with compares the requested id with the opened track's id,
      // which differs for Chromium's "default" alias even on success, so only a throw fails.
      await active.room.switchActiveDevice(browserKindOf(kind), id, true);
    } catch (error) {
      host.report({ type: "device-switch-failed", kind, errorName: errorName(error) });
      if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
      host.refresh();
      return err(mapDeviceSwitchError(error, kind));
    }
    if (!host.isCurrent(active)) return err(meetingErrors.connectionLost());
    requested = { ...requested, [kind]: id };
    host.refresh();
    return ok(undefined);
  };

  return {
    requested: () => requested,
    roomOptionsFor,
    refreshDevices: () => catalog.refresh(),
    selectDevice,
  };
}
