// TJ-ARCH-MOB-001 compliant
// Copy join code / Copy join link (lobby share card, room share card, room bar). The result
// is announced through the screen's status region (acceptance 5.3), not a toast.
import type { Announce } from "./live-status";
import { ROOM_COPY } from "./meeting-copy";
import { joinLink } from "./meeting-routes";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function copyJoinCode(code: string, announce: Announce): void {
  void writeClipboard(code).then((copied) =>
    announce(copied ? "Join code copied" : ROOM_COPY.copyFailed),
  );
}

export function copyJoinLink(code: string, announce: Announce): void {
  void writeClipboard(joinLink(code)).then((copied) =>
    announce(copied ? "Join link copied" : ROOM_COPY.copyFailed),
  );
}
