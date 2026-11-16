// TJ-ARCH-MOB-001 compliant
import type {
  ConnectError,
  MediaError,
  MediaTarget,
  RealtimeRoom,
  RoomCredentials,
  RoomSnapshot,
} from "@know-meet/application";
import { err, meetingErrors, type Result, type TrackKind } from "@know-meet/domain";

/** What presentation sees before the media code has loaded: not connected to anything. */
const IDLE_SNAPSHOT: RoomSnapshot = { connection: { status: "idle" }, local: null, remotes: [] };

interface Listener {
  readonly callback: () => void;
  unsubscribe: (() => void) | null;
}

interface Binding {
  readonly target: MediaTarget;
  readonly element: HTMLMediaElement;
  detach: (() => void) | null;
}

/**
 * A `RealtimeRoom` whose real implementation loads on the first `connect`, so the home page
 * never downloads the media SDK. Until then it is idle and empty; listeners and media
 * bindings made before the load are carried over to the real room once it exists. A failed
 * load reports `connection-lost` and the next `connect` tries again.
 */
export function createLazyRealtimeRoom(load: () => Promise<RealtimeRoom>): RealtimeRoom {
  let real: RealtimeRoom | null = null;
  let loading: Promise<RealtimeRoom | null> | null = null;
  const listeners = new Set<Listener>();
  const bindings = new Set<Binding>();

  function adopt(room: RealtimeRoom): void {
    real = room;
    for (const listener of listeners) listener.unsubscribe = room.subscribe(listener.callback);
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

  async function connect(credentials: RoomCredentials): Promise<Result<void, ConnectError>> {
    const room = await ensureLoaded();
    return room === null ? err(meetingErrors.connectionLost()) : room.connect(credentials);
  }

  async function disconnect(): Promise<void> {
    await real?.disconnect();
  }

  async function setMediaEnabled(
    kind: TrackKind,
    enabled: boolean,
  ): Promise<Result<void, MediaError>> {
    return real === null
      ? err(meetingErrors.connectionLost())
      : real.setMediaEnabled(kind, enabled);
  }

  function subscribe(callback: () => void): () => void {
    const listener: Listener = { callback, unsubscribe: real?.subscribe(callback) ?? null };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
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
    disconnect,
    setMediaEnabled,
    getSnapshot: () => real?.getSnapshot() ?? IDLE_SNAPSHOT,
    subscribe,
    attachMedia,
  };
}
