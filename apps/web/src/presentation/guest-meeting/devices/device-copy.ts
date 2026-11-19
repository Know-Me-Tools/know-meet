// TJ-ARCH-MOB-001 compliant
// Copy for the device pickers in the lobby and the room's "Audio and video" pane
// (device-settings shape, sections 6 and 7). Plain and calm; errors give the cause, then
// the fix. Domain and application carry codes only.
import type { DeviceError } from "@know-meet/application";
import type { DeviceKind } from "@know-meet/domain";
import { DEVICE_NOUN } from "./device-options";

export const DEVICE_COPY = {
  permissionHint: "Allow camera and microphone to choose a device.",
  noDeviceHint: "Connect one and it appears here.",
  paneTitle: "Audio and video",
  paneLede: "Only you see these settings.",
  paneClose: "Close audio and video settings",
  paneBody: "Audio and video settings",
  audioHeading: "Audio",
  videoHeading: "Video",
  speakerUnsupported:
    "This browser plays meeting audio through your system’s sound output. To change it, use your computer’s sound settings.",
  testSound: "Play test sound",
  testSoundPlaying: "Playing…",
  cameraOff: "Your camera is off",
  previewLabel: "Your camera preview",
} as const;

/** The option a select shows before the browser lists any device of its kind. */
export function placeholderOption(kind: DeviceKind): string {
  return kind === "microphone"
    ? "Default microphone"
    : kind === "camera"
      ? "Default camera"
      : "Default speaker";
}

export function noDeviceOption(kind: DeviceKind): string {
  return `No ${DEVICE_NOUN[kind].toLowerCase()} found`;
}

export function deviceChanged(kind: DeviceKind, label: string): string {
  return `${DEVICE_NOUN[kind]} changed to ${label}.`;
}

export function deviceDisconnected(label: string, fallback: string): string {
  return `${label} disconnected. Using ${fallback}.`;
}

export function deviceBlocked(kind: DeviceKind): string {
  return `${DEVICE_NOUN[kind]} blocked by the browser. Allow it in the address bar’s site settings, then reopen this panel.`;
}

/** The line under a select whose switch did not take; the select is back on the previous device. */
export function switchFailed(label: string, error?: DeviceError): string {
  if (error?.code === "device-not-found") {
    return `Couldn’t use ${label}. It’s no longer connected. Choose another device.`;
  }
  if (error?.code === "permission-denied") {
    return `Couldn’t use ${label}. The browser blocked it. Allow it in the address bar’s site settings, then try again.`;
  }
  if (error?.code === "connection-lost") {
    return `Couldn’t use ${label} because you’re not connected. Wait for the connection to come back, then try again.`;
  }
  return `Couldn’t use ${label}. Another app may be using it. Close it and try again.`;
}
