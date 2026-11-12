// TJ-ARCH-MOB-001 compliant
// Simulated playback for the static player stub (recordings.html `P`): no media is
// loaded; a 250ms tick advances the clock by 0.25 s x speed while "playing", so the
// stage, captions, chapters and the transcript's current line follow along. The
// state lives in the detail view (keyed by recording) so it survives tab changes.
import { useCallback, useEffect, useState } from "react";

const TICK_MS = 250;
const TICK_S = 0.25;

export interface Playback {
  readonly t: number;
  readonly total: number;
  readonly playing: boolean;
  readonly speed: number;
  readonly captions: boolean;
  readonly follow: boolean;
  readonly seek: (t: number) => void;
  readonly toggle: () => void;
  readonly setSpeed: (speed: number) => void;
  readonly setCaptions: (on: boolean) => void;
  readonly setFollow: (on: boolean) => void;
}

export function usePlayback(totalSeconds: number): Playback {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      setT((current) => Math.min(totalSeconds, current + TICK_S * speed));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing, speed, totalSeconds]);

  // Reaching the end stops playback (derived from t, not inside the updater).
  if (playing && t >= totalSeconds) setPlaying(false);

  const seek = useCallback(
    (next: number) => setT(Math.max(0, Math.min(totalSeconds, next))),
    [totalSeconds],
  );
  const toggle = useCallback(() => {
    if (!playing && t >= totalSeconds) setT(0);
    setPlaying(!playing);
  }, [playing, t, totalSeconds]);

  return { t, total: totalSeconds, playing, speed, captions, follow, seek, toggle, setSpeed, setCaptions, setFollow };
}
