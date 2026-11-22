// TJ-ARCH-MOB-001 compliant
// Prepares the background processor while the Background section is shown (WC-4, repair 9).
// The first segmented frame blocks the page while MediaPipe builds its GPU programs (0.5 s
// warm, 6.5 s cold); preparing on show moves that wait to a moment the section names
// ("Preparing background effects…") instead of after the person chooses. Only with effects
// supported and the camera publishing: a camera that is off gives segmentation no frame.
//
// W2 (web-conferencing-hardening): the pane stays mounted while closed, so this runs on join and
// whenever the camera turns on, not when the pane opens. "Preparing" is reported only once
// preparation has taken longer than PREPARING_SHOW_AFTER_MS, so a ready engine, which resolves at
// once, never flashes the line.
import type { ConferencingUseCases } from "@know-meet/application";
import { useEffect, useState } from "react";

/** A preparation that finishes sooner is not announced (no flash on warm opens). */
export const PREPARING_SHOW_AFTER_MS = 400;

export function usePrepareBackground(
  conferencing: ConferencingUseCases,
  canPrepare: boolean,
): boolean {
  const [preparing, setPreparing] = useState(false);
  useEffect(() => {
    if (!canPrepare) return;
    let current = true;
    const show = setTimeout(() => {
      if (current) setPreparing(true);
    }, PREPARING_SHOW_AFTER_MS);
    void conferencing.prepareBackgroundEffects().finally(() => {
      clearTimeout(show);
      if (current) setPreparing(false);
    });
    return () => {
      current = false;
      clearTimeout(show);
      setPreparing(false);
    };
  }, [conferencing, canPrepare]);
  return preparing;
}
