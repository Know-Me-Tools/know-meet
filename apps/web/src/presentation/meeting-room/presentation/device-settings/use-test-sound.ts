// TJ-ARCH-MOB-001 compliant
// "Play test sound" (device-settings shape, "Speaker supported"): a short, soft tone played
// through the chosen output, so people hear which speaker the meeting uses. The tone is
// generated (no audio file), routed to an <audio> element whose sink is the chosen speaker,
// and lasts 1.5 s; the button reads "Playing…" meanwhile. Offered only where the browser
// can choose a speaker (setSinkId), so the sink is always settable here.
import type { DeviceId } from "@know-meet/domain";
import { useCallback, useEffect, useRef, useState } from "react";

const TONE_MS = 1500;
const TONE_HZ = 660;
const TONE_GAIN = 0.15;
const FADE_S = 0.05;

interface SinkSelectable {
  setSinkId(sinkId: string): Promise<void>;
}

function canSelectSink(element: HTMLMediaElement): element is HTMLMediaElement & SinkSelectable {
  return "setSinkId" in element && typeof element.setSinkId === "function";
}

export interface TestSound {
  readonly playing: boolean;
  readonly play: () => void;
}

export function useTestSound(speaker: DeviceId | null): TestSound {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const play = useCallback(() => {
    if (stopRef.current !== null) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const output = context.createMediaStreamDestination();
    const element = new Audio();
    const seconds = TONE_MS / 1000;
    oscillator.frequency.value = TONE_HZ;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(TONE_GAIN, context.currentTime + FADE_S);
    gain.gain.setValueAtTime(TONE_GAIN, context.currentTime + seconds - FADE_S);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + seconds);
    oscillator.connect(gain).connect(output);
    element.srcObject = output.stream;

    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      stopRef.current = null;
      element.pause();
      element.srcObject = null;
      void context.close();
      setPlaying(false);
    };
    stopRef.current = stop;
    setPlaying(true);

    const sink =
      speaker !== null && canSelectSink(element) ? element.setSinkId(speaker) : Promise.resolve();
    sink
      .then(() => element.play())
      .then(() => {
        oscillator.start();
        oscillator.stop(context.currentTime + seconds);
        timer = window.setTimeout(stop, TONE_MS);
      })
      .catch(stop);
  }, [speaker]);

  return { playing, play };
}
