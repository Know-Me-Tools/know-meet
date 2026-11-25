// TJ-ARCH-MOB-001 compliant
import type {
  MediaTarget,
  RealtimeRoom,
  RecordingCapturePolicy,
  RoomSnapshot,
} from "@know-meet/application";
import { type DesiredMedia, desiredMedia } from "./desired-media";

/** One bound hidden media element and what it shows. */
export interface BoundMedia {
  readonly key: string;
  readonly medium: "video" | "audio";
  readonly kind: "camera" | "screen-share" | "audio";
  readonly label: string;
  readonly element: HTMLVideoElement | HTMLAudioElement;
}

export interface MediaBindings {
  /** Binds new media and drops what the snapshot no longer has. */
  sync(snapshot: RoomSnapshot): void;
  /** Bound media in snapshot order: cameras and shares first as drawn, then audio. */
  current(): readonly BoundMedia[];
  /** Detaches everything and releases the elements. */
  dispose(): void;
}

interface Entry {
  readonly target: MediaTarget;
  readonly bound: BoundMedia;
  readonly detach: () => void;
}

function createElement(medium: "video" | "audio"): HTMLVideoElement | HTMLAudioElement {
  const element = document.createElement(medium);
  // Muted: the meeting screen already plays the room; this element only feeds the recording.
  element.muted = true;
  element.autoplay = true;
  if (element instanceof HTMLVideoElement) element.playsInline = true;
  return element;
}

function kindOf(desired: DesiredMedia): BoundMedia["kind"] {
  if (desired.medium === "audio") return "audio";
  return desired.target.kind === "screen-share" ? "screen-share" : "camera";
}

/**
 * Binds the room's media to hidden elements through `RealtimeRoom.attachMedia`, the same
 * port the meeting screen uses. The room re-attaches a binding when a track is replaced or
 * subscribed later, so an element keeps up without help from here. Elements are never added
 * to the document.
 */
export function createMediaBindings(
  room: RealtimeRoom,
  allows: RecordingCapturePolicy["allows"] | undefined,
): MediaBindings {
  const entries = new Map<string, Entry>();
  let order: readonly string[] = [];

  const drop = (key: string): void => {
    const entry = entries.get(key);
    if (entry === undefined) return;
    entries.delete(key);
    entry.detach();
    entry.bound.element.srcObject = null;
  };

  return {
    sync: (snapshot) => {
      const wanted = desiredMedia(snapshot, allows);
      const keys = new Set(wanted.map((desired) => desired.key));
      for (const key of [...entries.keys()]) if (!keys.has(key)) drop(key);
      for (const desired of wanted) {
        const existing = entries.get(desired.key);
        if (existing !== undefined) {
          if (existing.bound.label === desired.label) continue;
          drop(desired.key);
        }
        const element = createElement(desired.medium);
        const detach = room.attachMedia(desired.target, element);
        void element.play().catch(() => undefined);
        entries.set(desired.key, {
          target: desired.target,
          bound: {
            key: desired.key,
            medium: desired.medium,
            kind: kindOf(desired),
            label: desired.label,
            element,
          },
          detach,
        });
      }
      order = wanted.map((desired) => desired.key);
    },
    current: () =>
      order.flatMap((key) => {
        const entry = entries.get(key);
        if (entry === undefined) return [];
        if (allows?.(entry.target.identity, entry.target.admissionKey) === false) return [];
        return [entry.bound];
      }),
    dispose: () => {
      for (const key of [...entries.keys()]) drop(key);
      order = [];
    },
  };
}
