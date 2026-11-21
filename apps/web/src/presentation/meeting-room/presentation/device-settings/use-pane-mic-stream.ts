// TJ-ARCH-MOB-001 compliant
// The audio the "Audio and video" pane's level meter measures (device-settings shape,
// section 8: "The pane's self preview and meter run only while the pane is open"). The
// room never hands out its published microphone (the port does not play or expose it), so
// the pane opens its own audio-only capture of the device in use, and only while the pane
// is open and the microphone is on. It follows device switches and stops when the pane
// closes. If the browser cannot open the device a second time, the meter shows silence;
// the meeting audio itself is not affected.
import type { DeviceId } from "@know-meet/domain";
import { useEffect, useState } from "react";

function stop(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

export function usePaneMicStream(
  listening: boolean,
  deviceId: DeviceId | null,
): MediaStream | null {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const media = navigator.mediaDevices;
    if (!listening || media === undefined) return undefined;
    let cancelled = false;
    let owned: MediaStream | null = null;
    const audio: MediaTrackConstraints | boolean =
      deviceId === null ? true : { deviceId: { exact: deviceId } };
    media.getUserMedia({ audio, video: false }).then(
      (next) => {
        if (cancelled) {
          stop(next);
          return;
        }
        owned = next;
        setStream(next);
      },
      () => {
        if (!cancelled) setStream(null);
      },
    );
    return () => {
      cancelled = true;
      stop(owned);
      setStream(null);
    };
  }, [listening, deviceId]);

  return stream;
}
