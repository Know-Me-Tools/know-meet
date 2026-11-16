// TJ-ARCH-MOB-001 compliant
// The lobby mic meter (prototype meet.html `#meter`): reads the preview stream's audio
// level with an AnalyserNode and writes it straight to the meter element once per frame
// (fill scale and aria-valuenow), so React does not re-render 60 times a second. It is
// live information the guest asked for, so it keeps updating under reduced motion, with
// no easing (acceptance 5.7).
import { type RefObject, useEffect } from "react";

const FFT_SIZE = 512;
const FULL_SCALE = 128;

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
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - FULL_SCALE));
      const level = Math.min(1, peak / FULL_SCALE);
      fill.style.transform = `scaleX(${level})`;
      meter.setAttribute("aria-valuenow", String(Math.round(level * 100)));
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
