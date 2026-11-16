// TJ-ARCH-MOB-001 compliant
// Names on tiles and in announcements (acceptance 5.1, 5.3). Pure functions over the
// domain participant; no framework imports.
import type { Participant } from "@know-meet/domain";

/** Up to two initials from a display name; "?" before a name is typed (lobby L2). */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "");
  const first = words[0];
  if (first === undefined) return "?";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return `${[...first][0] ?? ""}${last === undefined ? "" : ([...last][0] ?? "")}`.toUpperCase();
}

/** "Sam Patel (you)", then ", muted" and ", camera off" when they apply. */
export function tileName(participant: Participant): string {
  const base =
    participant.kind === "local" ? `${participant.displayName} (you)` : participant.displayName;
  const muted = participant.microphone.muted ? ", muted" : "";
  const cameraOff = participant.camera.muted ? ", camera off" : "";
  return `${base}${muted}${cameraOff}`;
}

/** A remote participant's camera shows video only when it is on and received. */
export function showsVideo(participant: Participant): boolean {
  if (participant.camera.muted) return false;
  return participant.kind === "local" ? true : participant.camera.subscribed;
}
