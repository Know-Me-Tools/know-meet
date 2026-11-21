// TJ-ARCH-MOB-001 compliant
// The lobby's local preview (acceptance L1-L5; wc05 task 5.1, WC-5). This is the browser's
// own camera and microphone, before any meeting connection exists, so it uses
// `getUserMedia` directly; the RealtimeRoom port only covers media once connected. The
// guest's wishes (mic on, camera on) and device choice (null = system default) drive one
// preview stream; the choice is what Join meeting hands to the room. A refused device turns
// its wish off and records why (blocked, missing, in use); pressing its toggle asks again.
// Switching a device keeps the last picture until the new stream arrives. A switch the
// browser refuses returns that kind to the last device that worked and records the device
// that failed (shape: "Switch failed"); the wish stays on. `release()` stops every track
// before Join meeting so the meeting connection can open the devices itself.
import {
  DEFAULT_DEVICE_CHOICE,
  type DeviceChoice,
  type DeviceId,
  type TrackKind,
} from "@know-meet/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceProblem } from "../../guest-meeting/meeting-copy";

export interface DeviceWishes {
  readonly microphone: boolean;
  readonly camera: boolean;
}

export type SwitchFailures = Readonly<Record<TrackKind, DeviceId | null>>;

export interface DevicePreview {
  readonly wishes: DeviceWishes;
  /** True while the browser permission prompt (or the first device start) has not answered. */
  readonly pending: boolean;
  readonly stream: MediaStream | null;
  readonly problems: Readonly<Record<TrackKind, DeviceProblem | null>>;
  /** The devices picked in the lobby; null is the system default (WC-5 negative control). */
  readonly choice: DeviceChoice;
  /** Per kind, the device a switch could not open; cleared by the next choice of that kind. */
  readonly switchFailures: SwitchFailures;
  readonly toggle: (kind: TrackKind) => void;
  readonly choose: (kind: TrackKind, id: DeviceId | null) => void;
  /** Back to the system default without a "changed" event (the chosen device was unplugged). */
  readonly fallBack: (kind: TrackKind) => void;
  /** Stops every track and holds the preview off until `resume()`. */
  readonly release: () => void;
  readonly resume: () => void;
}

/** Told when a switch of a device that is on has opened the new device. */
export interface PreviewEvents {
  readonly switched: (kind: TrackKind, id: DeviceId | null) => void;
}

const TRACK_KINDS: readonly TrackKind[] = ["microphone", "camera"];

const NO_PROBLEMS: Readonly<Record<TrackKind, DeviceProblem | null>> = {
  microphone: null,
  camera: null,
};

const NO_FAILURES: SwitchFailures = { microphone: null, camera: null };

function problemOf(error: unknown): DeviceProblem {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "in-use";
  return "blocked";
}

function constraintFor(id: DeviceId | null): MediaTrackConstraints | boolean {
  return id === null ? true : { deviceId: { exact: id } };
}

function constraintsFor(kinds: readonly TrackKind[], choice: DeviceChoice): MediaStreamConstraints {
  return {
    audio: kinds.includes("microphone") ? constraintFor(choice.microphone) : false,
    video: kinds.includes("camera") ? constraintFor(choice.camera) : false,
  };
}

interface Acquired {
  readonly stream: MediaStream | null;
  readonly refused: Partial<Record<TrackKind, DeviceProblem>>;
}

/** One request for everything wanted; if it fails, one request per device to learn which. */
async function acquire(kinds: readonly TrackKind[], choice: DeviceChoice): Promise<Acquired> {
  const media = navigator.mediaDevices;
  if (media === undefined) {
    const refused: Partial<Record<TrackKind, DeviceProblem>> = {};
    for (const kind of kinds) refused[kind] = "missing";
    return { stream: null, refused };
  }
  try {
    return { stream: await media.getUserMedia(constraintsFor(kinds, choice)), refused: {} };
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
      const single = await media.getUserMedia(constraintsFor([kind], choice));
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

/** The kinds whose newly picked device was refused although another device had worked. */
function failedSwitchesOf(
  kinds: readonly TrackKind[],
  refused: Acquired["refused"],
  picked: DeviceChoice,
  lastGood: DeviceChoice,
): readonly TrackKind[] {
  return kinds.filter((kind) => refused[kind] !== undefined && picked[kind] !== lastGood[kind]);
}

export function useDevicePreview(events?: PreviewEvents): DevicePreview {
  const [wishes, setWishes] = useState<DeviceWishes>({ microphone: true, camera: true });
  const [choice, setChoice] = useState<DeviceChoice>(DEFAULT_DEVICE_CHOICE);
  const [switchFailures, setSwitchFailures] = useState<SwitchFailures>(NO_FAILURES);
  const [released, setReleased] = useState(false);
  const [pending, setPending] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [problems, setProblems] = useState(NO_PROBLEMS);
  const owned = useRef<MediaStream | null>(null);
  /** The choice each kind last opened successfully: where a failed switch returns to. */
  const lastGood = useRef<DeviceChoice>(DEFAULT_DEVICE_CHOICE);
  const switching = useRef<TrackKind | null>(null);
  const latestEvents = useRef(events);
  const latestWishes = useRef(wishes);
  useEffect(() => {
    latestEvents.current = events;
    latestWishes.current = wishes;
  });
  useEffect(() => () => stopStream(owned.current), []);

  // Only the choice of a wished device starts a new request.
  const microphone = wishes.microphone ? choice.microphone : null;
  const camera = wishes.camera ? choice.camera : null;

  useEffect(() => {
    const wanted: DeviceWishes = { microphone: wishes.microphone, camera: wishes.camera };
    const picked: DeviceChoice = { microphone, camera };
    const kinds = TRACK_KINDS.filter((kind) => wanted[kind]);
    const replace = (next: MediaStream | null) => {
      if (owned.current !== next) stopStream(owned.current);
      owned.current = next;
      setStream(next);
    };
    if (released || kinds.length === 0) {
      setPending(false);
      replace(null);
      return undefined;
    }
    let cancelled = false;
    // A device switch keeps the toggles usable; anything else may be waiting on a prompt.
    setPending(switching.current === null || owned.current === null);
    void acquire(kinds, picked).then(({ stream: next, refused }) => {
      if (cancelled) {
        stopStream(next);
        return;
      }
      const failed = failedSwitchesOf(kinds, refused, picked, lastGood.current);
      if (failed.length > 0) {
        // Back to the device that worked; this effect runs again with it.
        stopStream(next);
        switching.current = null;
        setSwitchFailures((prev) => {
          const nextFailures = { ...prev };
          for (const kind of failed) nextFailures[kind] = picked[kind];
          return nextFailures;
        });
        setChoice((prev) => {
          const reverted = { ...prev };
          for (const kind of failed) reverted[kind] = lastGood.current[kind];
          return reverted;
        });
        return;
      }
      replace(next);
      setPending(false);
      const opened = (kind: TrackKind) => wanted[kind] && refused[kind] === undefined;
      lastGood.current = {
        microphone: opened("microphone") ? picked.microphone : lastGood.current.microphone,
        camera: opened("camera") ? picked.camera : lastGood.current.camera,
      };
      const switched = switching.current;
      switching.current = null;
      if (switched !== null && opened(switched)) {
        latestEvents.current?.switched(switched, picked[switched]);
      }
      setProblems((prev) => ({
        microphone: wanted.microphone ? (refused.microphone ?? null) : prev.microphone,
        camera: wanted.camera ? (refused.camera ?? null) : prev.camera,
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
    };
  }, [wishes.microphone, wishes.camera, microphone, camera, released]);

  const toggle = useCallback((kind: TrackKind) => {
    setWishes((prev) => ({ ...prev, [kind]: !prev[kind] }));
  }, []);
  const choose = useCallback((kind: TrackKind, id: DeviceId | null) => {
    switching.current = latestWishes.current[kind] ? kind : null;
    setSwitchFailures((prev) => (prev[kind] === null ? prev : { ...prev, [kind]: null }));
    setChoice((prev) => (prev[kind] === id ? prev : { ...prev, [kind]: id }));
  }, []);
  const fallBack = useCallback((kind: TrackKind) => {
    switching.current = null;
    setChoice((prev) => (prev[kind] === null ? prev : { ...prev, [kind]: null }));
  }, []);
  const release = useCallback(() => setReleased(true), []);
  const resume = useCallback(() => setReleased(false), []);

  return {
    wishes,
    pending,
    stream,
    problems,
    choice,
    switchFailures,
    toggle,
    choose,
    fallBack,
    release,
    resume,
  };
}
