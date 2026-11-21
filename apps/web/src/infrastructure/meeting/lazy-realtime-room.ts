// TJ-ARCH-MOB-001 compliant
import type {
  ConnectError,
  ConnectOptions,
  MediaTarget,
  RealtimeRoom,
  RoomCredentials,
  RoomSnapshot,
} from "@know-meet/application";
import {
  type ConnectionLost,
  type ConsentEnvelope,
  DEFAULT_ACTIVE_DEVICES,
  err,
  type MediaDevice,
  meetingErrors,
  NO_BACKGROUND_EFFECT_STATE,
  type Result,
} from "@know-meet/domain";
import { detectConferencingSupport, getDeviceCatalog } from "@know-meet/realtime/browser";

export interface LazyRealtimeRoomOptions {
  /**
   * Whether the loaded room gets a background processor (wc07). Must match what the loader
   * passes, so `support` stays the same when the media code arrives. Off by default.
   */
  readonly backgroundEffects?: boolean;
}

interface Listener<T> {
  readonly callback: T;
  unsubscribe: (() => void) | null;
}

interface Binding {
  readonly target: MediaTarget;
  readonly element: HTMLMediaElement;
  detach: (() => void) | null;
}

type ConsentListener = (envelope: ConsentEnvelope) => void;

const NO_LIST: readonly never[] = [];

/** Not connected to anything: the answer of every room action before the media code loads. */
function notJoined(): Promise<Result<never, ConnectionLost>> {
  return Promise.resolve(err(meetingErrors.connectionLost()));
}

/**
 * A `RealtimeRoom` whose real implementation loads on the first `connect`, so the home page
 * and the lobby never download the media SDK. Until then it is idle and empty except for what
 * the browser itself reports: the device list (kept current through `devicechange`, without
 * a permission prompt) and support, read from the SDK-free `@know-meet/realtime/browser`
 * entry that the loaded room reads too. Listeners, consent listeners and media bindings made
 * before the load are carried over to the real room once it exists. A failed load reports
 * `connection-lost` and the next `connect` tries again.
 */
export function createLazyRealtimeRoom(
  load: () => Promise<RealtimeRoom>,
  options: LazyRealtimeRoomOptions = {},
): RealtimeRoom {
  const support = detectConferencingSupport({
    backgroundEffects: options.backgroundEffects ?? false,
  });
  const catalog = getDeviceCatalog();
  let real: RealtimeRoom | null = null;
  let loading: Promise<RealtimeRoom | null> | null = null;
  const listeners = new Set<Listener<() => void>>();
  const consentListeners = new Set<Listener<ConsentListener>>();
  const bindings = new Set<Binding>();

  function idleSnapshot(available: readonly MediaDevice[]): RoomSnapshot {
    return {
      connection: { status: "idle" },
      local: null,
      remotes: NO_LIST,
      screenShares: NO_LIST,
      chat: NO_LIST,
      devices: { available, active: DEFAULT_ACTIVE_DEVICES },
      audioPlayback: "allowed",
      backgroundEffect: NO_BACKGROUND_EFFECT_STATE,
      support,
    };
  }

  let idle = idleSnapshot(catalog.current());

  // Page lifetime, like the catalog: once the real room exists it reports devices itself.
  catalog.subscribe(() => {
    if (real !== null) return;
    idle = idleSnapshot(catalog.current());
    for (const listener of [...listeners]) listener.callback();
  });

  function adopt(room: RealtimeRoom): void {
    real = room;
    for (const listener of listeners) listener.unsubscribe = room.subscribe(listener.callback);
    for (const listener of consentListeners) {
      listener.unsubscribe = room.onConsentMessage(listener.callback);
    }
    for (const binding of bindings) {
      binding.detach = room.attachMedia(binding.target, binding.element);
    }
    for (const listener of [...listeners]) listener.callback();
  }

  function ensureLoaded(): Promise<RealtimeRoom | null> {
    if (real !== null) return Promise.resolve(real);
    loading ??= load().then(
      (room) => {
        adopt(room);
        return room;
      },
      () => {
        loading = null;
        return null;
      },
    );
    return loading;
  }

  async function connect(
    credentials: RoomCredentials,
    connectOptions?: ConnectOptions,
  ): Promise<Result<void, ConnectError>> {
    const room = await ensureLoaded();
    if (room === null) return err(meetingErrors.connectionLost());
    return room.connect(credentials, connectOptions);
  }

  function subscribe(callback: () => void): () => void {
    const listener: Listener<() => void> = {
      callback,
      unsubscribe: real?.subscribe(callback) ?? null,
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      listener.unsubscribe?.();
    };
  }

  function onConsentMessage(callback: ConsentListener): () => void {
    const listener: Listener<ConsentListener> = {
      callback,
      unsubscribe: real?.onConsentMessage(callback) ?? null,
    };
    consentListeners.add(listener);
    return () => {
      consentListeners.delete(listener);
      listener.unsubscribe?.();
    };
  }

  function attachMedia(target: MediaTarget, element: HTMLMediaElement): () => void {
    const detach = real?.attachMedia(target, element) ?? null;
    const binding: Binding = { target, element, detach };
    bindings.add(binding);
    return () => {
      bindings.delete(binding);
      binding.detach?.();
    };
  }

  return {
    connect,
    disconnect: async () => {
      await real?.disconnect();
    },
    setMediaEnabled: (kind, enabled) => real?.setMediaEnabled(kind, enabled) ?? notJoined(),
    getSnapshot: () => real?.getSnapshot() ?? idle,
    subscribe,
    attachMedia,
    setScreenShareEnabled: (enabled) => real?.setScreenShareEnabled(enabled) ?? notJoined(),
    sendChat: (message) => real?.sendChat(message) ?? notJoined(),
    refreshDevices: () => real?.refreshDevices() ?? catalog.refresh(),
    selectDevice: (kind, id) => real?.selectDevice(kind, id) ?? notJoined(),
    startAudio: () => real?.startAudio() ?? notJoined(),
    setBackgroundEffect: (effect) => real?.setBackgroundEffect(effect) ?? notJoined(),
    prepareBackgroundEffects: () => real?.prepareBackgroundEffects() ?? Promise.resolve(),
    sendConsentMessage: (message, to) => real?.sendConsentMessage(message, to) ?? notJoined(),
    onConsentMessage,
  };
}
