// TJ-ARCH-MOB-001 compliant
// The microphone level meter (prototype meet.html `#meter`; device-settings shape DS-2):
// reads a stream's audio level with an AnalyserNode and writes the fill scale straight to
// the element once per frame, so React does not re-render 60 times a second. The
// accessible value (aria-valuenow, 0 to 100) is written at most ten times a second, with
// no live region. It is live information the participant asked for, so it keeps updating
// under reduced motion, with no easing (DS-11).
import { type RefObject, useEffect } from "react";

const FFT_SIZE = 512;
const FULL_SCALE = 128;
/** DS-2: aria-valuenow changes at most ten times a second. */
const VALUE_INTERVAL_MS = 100;

export function useMicLevel(
  stream: MediaStream | null,
  meterRef: RefObject<HTMLElement | null>,
  fillRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const meter = meterRef.current;
    const fill = fillRef.current;
    const track = stream?.getAudioTracks()[0];
    if (stream === null || track === undefined || meter === null || fill === null) {
      return undefined;
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    const source = context.createMediaStreamSource(new MediaStream([track]));
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    let valueWrittenAt = 0;
    const tick = (now: number) => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - FULL_SCALE));
      const level = Math.min(1, peak / FULL_SCALE);
      fill.style.transform = `scaleX(${level})`;
      if (now - valueWrittenAt >= VALUE_INTERVAL_MS) {
        valueWrittenAt = now;
        meter.setAttribute("aria-valuenow", String(Math.round(level * 100)));
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      fill.style.transform = "scaleX(0)";
      meter.setAttribute("aria-valuenow", "0");
      void context.close();
    };
  }, [stream, meterRef, fillRef]);
}
