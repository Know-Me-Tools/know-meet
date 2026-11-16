import type { MediaTarget } from "@know-meet/application";

/** The two calls the registry needs from a media track. The SDK's `Track` satisfies it. */
export interface AttachableTrack {
  attach(element: HTMLMediaElement): unknown;
  detach(element: HTMLMediaElement): unknown;
}

/** The track a target should play right now, or null when there is none to play. */
export type TrackResolver = (target: MediaTarget) => AttachableTrack | null;

/**
 * Element bindings that outlive any one track. Each binding remembers which track it attached;
 * `reconcile` asks the resolver again and, where the answer changed, detaches the old track and
 * attaches the new one. That is how a binding survives unsubscribe and resubscribe (a new track
 * object), reconnection, and a `bind` that happens before the track exists.
 */
export interface MediaBindings {
  /** Binds and attaches at once if a track exists. The returned function detaches; it is idempotent. */
  bind(target: MediaTarget, element: HTMLMediaElement, resolve: TrackResolver): () => void;
  reconcile(resolve: TrackResolver): void;
  /** Live bindings, for tests and diagnostics. */
  count(): number;
}

interface Binding {
  readonly target: MediaTarget;
  readonly element: HTMLMediaElement;
}

export function createMediaBindings(): MediaBindings {
  const attached = new Map<Binding, AttachableTrack | null>();

  const update = (
    binding: Binding,
    current: AttachableTrack | null,
    next: AttachableTrack | null,
  ) => {
    if (next === current) return;
    if (current !== null) current.detach(binding.element);
    if (next !== null) next.attach(binding.element);
    attached.set(binding, next);
  };

  return {
    bind: (target, element, resolve) => {
      const binding: Binding = { target, element };
      attached.set(binding, null);
      update(binding, null, resolve(target));
      return () => {
        if (!attached.has(binding)) return;
        const current = attached.get(binding) ?? null;
        attached.delete(binding);
        if (current !== null) current.detach(element);
      };
    },
    reconcile: (resolve) => {
      for (const [binding, current] of [...attached]) {
        update(binding, current, resolve(binding.target));
      }
    },
    count: () => attached.size,
  };
}
