// TJ-ARCH-MOB-001 compliant
// dashboard.html `.live-pip`: a 12px ember dot with an expanding ring (scale 1 →
// 2.6, opacity 0.6 → 0, 1.8s ease-out, page-local timing per D-3). Transform and
// opacity only, run with the Web Animations API so no page CSS is needed; it never
// starts under `prefers-reduced-motion: reduce`. Decorative: the "Live now"
// label carries the meaning.
import { useEffect, useRef } from "react";

const RING_MS = 1800;

export function LivePip() {
  const ring = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ring.current;
    if (element === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return undefined;
    const easing = getComputedStyle(element).getPropertyValue("--ease-out").trim() || "ease-out";
    const animation = element.animate(
      [
        { transform: "scale(1)", opacity: 0.6 },
        { transform: "scale(2.6)", opacity: 0 },
      ],
      { duration: RING_MS, iterations: Number.POSITIVE_INFINITY, easing },
    );
    return () => animation.cancel();
  }, []);
  return (
    <span aria-hidden="true" className="relative size-3 flex-none rounded-round bg-ember">
      <span ref={ring} className="absolute inset-0 rounded-round bg-ember opacity-0" />
    </span>
  );
}
