// TJ-ARCH-MOB-001 compliant
// DESIGN.md "Resize motion": a width-class crossing animates once; continuous
// resizing inside a class never animates. View Transitions when supported
// (`km-nav`, `km-nav-current`, `km-main`; token durations/easing and the
// opacity-only snapshot crossfade in styles/frame.css), with the UA group
// keyframes reduced to transform only, so nothing animates width or height. Without View Transitions the nav crossfades (opacity, dur-nav-label)
// and the class swaps at once. Reduced motion: instant, no transition at all.
import { prefersReducedMotion, readMotion } from "./motion";

const NAV_SELECTOR = '[data-testid="km-appnav"]';
const GROUP_PSEUDO_PREFIX = "::view-transition-group(";

const COMMITTING_ATTRIBUTE = "data-nav-committing";
// Keyframe properties a group animation may keep: transform plus timing. The UA
// also tweens width, height and backdrop-filter; those are dropped so the group
// snaps to its new box and its snapshots crossfade (opacity only, frame.css).
const COMPOSITOR_KEYS: ReadonlySet<string> = new Set(["transform", "offset", "easing", "composite"]);

function transformOnlyGroups(doc: Document): void {
  for (const animation of doc.getAnimations()) {
    const effect = animation.effect;
    if (!(effect instanceof KeyframeEffect)) continue;
    if (!effect.pseudoElement?.startsWith(GROUP_PSEUDO_PREFIX)) continue;
    const frames = effect.getKeyframes().map((frame) =>
      Object.fromEntries(Object.entries(frame).filter(([key]) => COMPOSITOR_KEYS.has(key))),
    );
    effect.setKeyframes(frames);
  }
}

/**
 * Commits with link colour/background transitions off (frame.css keys on the
 * attribute): the class swap never fades the links, the morph is the only
 * motion. Styles are flushed before transitions come back, so nothing starts.
 */
function commitWithoutFades(doc: Document, commit: () => void): void {
  const root = doc.documentElement;
  root.setAttribute(COMMITTING_ATTRIBUTE, "");
  try {
    commit();
    void doc.defaultView?.getComputedStyle(root).color;
    const probe = doc.querySelector(`${NAV_SELECTOR} a`);
    if (probe !== null) void doc.defaultView?.getComputedStyle(probe).color;
  } finally {
    root.removeAttribute(COMMITTING_ATTRIBUTE);
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
      const committed = () => commitWithoutFades(doc, commit);
      if (prefersReducedMotion(view)) {
        committed();
        return;
      }
      if (typeof doc.startViewTransition !== "function") {
        committed();
        crossfadeNav(view);
        return;
      }
      const transition = doc.startViewTransition(committed);
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
