// TJ-ARCH-MOB-001 compliant
// Copy for screen sharing (WC-1). Errors give the cause, then the fix. Domain and
// application carry codes only; every string lives here.
import type { ScreenShareError } from "@know-meet/application";

export const SHARE_COPY = {
  unsupported: "This browser can’t share a screen. Use a desktop browser to share.",
  started: "You’re sharing your screen",
  stopped: "You stopped sharing your screen",
  localHead: "You are presenting",
  localFoot: "Everyone in the meeting sees what you share.",
  localName: "Your screen share",
  waiting: "Loading the shared screen…",
} as const;

export function remoteShareName(name: string): string {
  return `${name}’s screen`;
}

export function remoteShareHead(name: string): string {
  return `${name} is presenting`;
}

export function remoteShareStarted(name: string): string {
  return `${name} is sharing their screen`;
}

export function remoteShareStopped(name: string): string {
  return `${name} stopped sharing`;
}

/**
 * What to announce when a share could not start or stop. Closing the browser's picker
 * is the participant's own choice, so it says nothing.
 */
export function shareErrorAnnouncement(error: ScreenShareError): string | null {
  if (error.code === "share-not-started") return null;
  if (error.code === "unsupported") return SHARE_COPY.unsupported;
  return "You’re not connected. Wait for the connection to come back, then share again.";
}
