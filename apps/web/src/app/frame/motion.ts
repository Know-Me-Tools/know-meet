// TJ-ARCH-MOB-001 compliant
// Reads the motion tokens (tokens.css) for script-driven animation, so Web
// Animations and View Transitions use the same values as CSS.

export interface MotionToken {
  readonly duration: number;
  readonly easing: string;
}

function readVar(view: Window, name: string): string {
  return view.getComputedStyle(view.document.documentElement).getPropertyValue(name).trim();
}

/** `--dur-*` values are `<n>ms` in the generated tokens. */
export function readDurationMs(view: Window, name: string): number {
  const raw = readVar(view, name);
  const ms = Number.parseFloat(raw);
  if (!raw.endsWith("ms") || Number.isNaN(ms)) {
    throw new Error(`Motion token ${name} must be a millisecond value, got "${raw}"`);
  }
  return ms;
}

export function readMotion(view: Window, durationVar: string, easingVar: string): MotionToken {
  return { duration: readDurationMs(view, durationVar), easing: readVar(view, easingVar) };
}

export function prefersReducedMotion(view: Window): boolean {
  return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
