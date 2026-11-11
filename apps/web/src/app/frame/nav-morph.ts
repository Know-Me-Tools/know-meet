// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Resize motion": a width-class crossing animates once; continuous
// resizing inside a class never animates. View Transitions when supported
// (`km-nav`, `km-nav-current`, `km-main`; durations in styles/frame.css), with the
// UA group keyframes reduced to transform only, so nothing animates width or
// height. Without View Transitions the nav crossfades (opacity, dur-nav-label)
// and the class swaps at once. Reduced motion: instant, no transition at all.
import { prefersReducedMotion, readMotion } from "./motion";

const NAV_SELECTOR = '[data-testid="km-appnav"]';
const GROUP_PSEUDO_PREFIX = "::view-transition-group(";

/** Keep only `transform` (plus timing) in the UA group animations. */
function transformOnlyGroups(doc: Document): void {
  for (const animation of doc.getAnimations()) {
    const effect = animation.effect;
    if (!(effect instanceof KeyframeEffect)) continue;
    if (!effect.pseudoElement?.startsWith(GROUP_PSEUDO_PREFIX)) continue;
    const frames = effect.getKeyframes().map((frame) => {
      const { width: _w, height: _h, computedOffset: _c, ...rest } = frame;
      return rest;
    });
    effect.setKeyframes(frames);
  }
}

function crossfadeNav(view: Window): void {
  const nav = view.document.querySelector(NAV_SELECTOR);
  if (nav === null) return;
  const { duration, easing } = readMotion(view, "--dur-nav-label", "--ease-layout");
  nav.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing });
}

export interface NavMorph {
  /** Runs `commit` (a synchronous DOM update) inside the right transition. */
  readonly run: (commit: () => void) => void;
}

export function createNavMorph(view: Window): NavMorph {
  let running: ViewTransition | null = null;
  return {
    run: (commit) => {
      const doc = view.document;
      running?.skipTransition();
      running = null;
      if (prefersReducedMotion(view)) {
        commit();
        return;
      }
      if (typeof doc.startViewTransition !== "function") {
        commit();
        crossfadeNav(view);
        return;
      }
      const transition = doc.startViewTransition(commit);
      running = transition;
      // `ready` rejects with AbortError when a later crossing skips this
      // transition; the new crossing owns the DOM then, so there is nothing to do.
      transition.ready.then(
        () => transformOnlyGroups(doc),
        (error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) reportError(error);
        },
      );
      transition.finished
        .catch((error: unknown) => reportError(error))
        .finally(() => {
          if (running === transition) running = null;
        });
    },
  };
}
