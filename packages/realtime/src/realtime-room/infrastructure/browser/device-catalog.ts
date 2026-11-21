import type { MediaDevice } from "@know-meet/domain";
import { NO_DEVICES, sameDevices, toMediaDevices } from "../../domain/device-mapping.ts";

/**
 * The browser's device list, kept current from page load: read once at creation and again on
 * every `devicechange`. It only enumerates, so it never opens a permission prompt; labels stay
 * empty until the site has permission for that kind (WC-5).
 */
export interface DeviceCatalog {
  /** The latest list, the same array until it changes. */
  current(): readonly MediaDevice[];
  /** Reads the list again; resolves once read. Calls run one after another. */
  refresh(): Promise<void>;
  /** Called after the list changed. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

let shared: DeviceCatalog | null = null;

/**
 * One catalog per page. The lazy room (before the media SDK loads) and the LiveKit adapter
 * both read this one, so the lobby's list does not flicker when the SDK arrives.
 */
export function getDeviceCatalog(): DeviceCatalog {
  shared ??= createDeviceCatalog(browserMediaDevices());
  return shared;
}

function browserMediaDevices(): MediaDevices | null {
  if (typeof navigator === "undefined") return null;
  return navigator.mediaDevices ?? null;
}

/** A catalog over `media`; null (no secure context, no browser) reports no devices. */
export function createDeviceCatalog(media: MediaDevices | null): DeviceCatalog {
  let devices: readonly MediaDevice[] = NO_DEVICES;
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const read = async (): Promise<void> => {
    if (media === null) return;
    let next: readonly MediaDevice[];
    try {
      next = toMediaDevices(await media.enumerateDevices());
    } catch {
      // enumerateDevices rejects only without a usable document; keep the last list.
      return;
    }
    if (sameDevices(devices, next)) return;
    devices = next;
    for (const listener of [...listeners]) listener();
  };

  const refresh = (): Promise<void> => {
    queue = queue.then(read);
    return queue;
  };

  media?.addEventListener("devicechange", () => {
    void refresh();
  });
  void refresh();

  return {
    current: () => devices,
    refresh,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
