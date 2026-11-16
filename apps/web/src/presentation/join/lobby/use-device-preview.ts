// TJ-ARCH-MOB-001 compliant
// The lobby's local preview (acceptance L1-L5). This is the browser's own camera and
// microphone, before any meeting connection exists, so it uses `getUserMedia` directly; the
// RealtimeRoom port only covers media once connected. The guest's wishes (mic on, camera
// on) drive one preview stream. A refused device turns its wish off and records why
// (blocked, missing, in use); pressing its toggle asks again. `release()` stops every
// track before Join meeting so the meeting connection can open the devices itself.
import type { TrackKind } from "@know-meet/domain";
import { useCallback, useEffect, useState } from "react";
import type { DeviceProblem } from "../../guest-meeting/meeting-copy";

export interface DeviceWishes {
  readonly microphone: boolean;
  readonly camera: boolean;
}

export interface DevicePreview {
  readonly wishes: DeviceWishes;
  /** True while the browser permission prompt (or device start) has not answered. */
  readonly pending: boolean;
  readonly stream: MediaStream | null;
  readonly problems: Readonly<Record<TrackKind, DeviceProblem | null>>;
  readonly toggle: (kind: TrackKind) => void;
  /** Stops every track and holds the preview off until `resume()`. */
  readonly release: () => void;
  readonly resume: () => void;
}

const NO_PROBLEMS: Readonly<Record<TrackKind, DeviceProblem | null>> = {
  microphone: null,
  camera: null,
};

function problemOf(error: unknown): DeviceProblem {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "in-use";
  return "blocked";
}

function constraintsFor(kinds: readonly TrackKind[]): MediaStreamConstraints {
  return { audio: kinds.includes("microphone"), video: kinds.includes("camera") };
}

interface Acquired {
  readonly stream: MediaStream | null;
  readonly refused: Partial<Record<TrackKind, DeviceProblem>>;
}

/** One request for everything wanted; if it fails, one request per device to learn which. */
async function acquire(kinds: readonly TrackKind[]): Promise<Acquired> {
  const media = navigator.mediaDevices;
  if (media === undefined) {
    const refused: Partial<Record<TrackKind, DeviceProblem>> = {};
    for (const kind of kinds) refused[kind] = "missing";
    return { stream: null, refused };
  }
  try {
    return { stream: await media.getUserMedia(constraintsFor(kinds)), refused: {} };
  } catch (error) {
    const [only] = kinds;
    if (kinds.length === 1 && only !== undefined) {
      const refused: Partial<Record<TrackKind, DeviceProblem>> = {};
      refused[only] = problemOf(error);
      return { stream: null, refused };
    }
  }
  const tracks: MediaStreamTrack[] = [];
  const refused: Partial<Record<TrackKind, DeviceProblem>> = {};
  for (const kind of kinds) {
    try {
      const single = await media.getUserMedia(constraintsFor([kind]));
      tracks.push(...single.getTracks());
    } catch (error) {
      refused[kind] = problemOf(error);
    }
  }
  return { stream: tracks.length === 0 ? null : new MediaStream(tracks), refused };
}

function stopStream(stream: MediaStream | null): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

export function useDevicePreview(): DevicePreview {
  const [wishes, setWishes] = useState<DeviceWishes>({ microphone: true, camera: true });
  const [released, setReleased] = useState(false);
  const [pending, setPending] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [problems, setProblems] = useState(NO_PROBLEMS);

  useEffect(() => {
    const kinds: TrackKind[] = [];
    if (wishes.microphone) kinds.push("microphone");
    if (wishes.camera) kinds.push("camera");
    if (released || kinds.length === 0) {
      setPending(false);
      return undefined;
    }
    let cancelled = false;
    let owned: MediaStream | null = null;
    setPending(true);
    void acquire(kinds).then(({ stream: next, refused }) => {
      if (cancelled) {
        stopStream(next);
        return;
      }
      owned = next;
      setStream(next);
      setPending(false);
      setProblems((prev) => ({
        microphone: wishes.microphone ? (refused.microphone ?? null) : prev.microphone,
        camera: wishes.camera ? (refused.camera ?? null) : prev.camera,
      }));
      if (refused.microphone !== undefined || refused.camera !== undefined) {
        setWishes((prev) => ({
          microphone: prev.microphone && refused.microphone === undefined,
          camera: prev.camera && refused.camera === undefined,
        }));
      }
    });
    return () => {
      cancelled = true;
      stopStream(owned);
      setStream(null);
    };
  }, [wishes.microphone, wishes.camera, released]);

  const toggle = useCallback((kind: TrackKind) => {
    setWishes((prev) => ({ ...prev, [kind]: !prev[kind] }));
  }, []);
  const release = useCallback(() => setReleased(true), []);
  const resume = useCallback(() => setReleased(false), []);

  return { wishes, pending, stream, problems, toggle, release, resume };
}
