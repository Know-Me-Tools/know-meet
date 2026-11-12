import type { Page } from "@playwright/test";
import { cssTimeToMs, normaliseEasing, tokenValue } from "../support/oracle.ts";
import type { ProbeResult } from "./motion-probe.ts";

/** One animation that started because of the resize, as the browser reports it. */
export interface MorphAnimation {
  readonly target: string;
  readonly durationMs: number;
  readonly easing: string;
  readonly properties: readonly string[];
}

export interface MorphObservation {
  readonly navClassBefore: string;
  readonly navClassAfter: string;
  readonly viewTransitionCalls: number;
  readonly animations: readonly MorphAnimation[];
}

/** Properties the spec allows to animate during the nav morph (DESIGN.md, Resize motion). */
const COMPOSITOR_ONLY = new Set(["transform", "opacity"]);
const OBSERVE_CAP_MS = 1500;
const MIN_OBSERVE_MS = 150;
const IDLE_FRAMES = 3;

const navClassOf = (page: Page, navSelector: string): Promise<string> =>
  page.evaluate(
    (selector) => document.querySelector(selector)?.getAttribute("data-nav-class") ?? "missing",
    navSelector,
  );

/**
 * Resizes the viewport and records every animation the resize starts. Animations already
 * running before the resize (the dots' infinite loops) are excluded by identity. The window
 * closes when nothing new has run for a few frames, or at a hard cap, so an instant change
 * is observed as "no animation" without a fixed sleep.
 */
export async function observeResize(
  page: Page,
  navSelector: string,
  width: number,
  height: number,
): Promise<MorphObservation> {
  const navClassBefore = await navClassOf(page, navSelector);
  await page.evaluate(() => {
    const w = window as unknown as { __kmMorphCalls?: number };
    w.__kmMorphCalls = 0;
    const original = document.startViewTransition?.bind(document);
    if (original === undefined) return;
    document.startViewTransition = ((...args: Parameters<typeof original>) => {
      w.__kmMorphCalls = (w.__kmMorphCalls ?? 0) + 1;
      return original(...args);
    }) as typeof document.startViewTransition;
  });
  const recording = page.evaluate(
    ({ selector, cap, minMs, idleFrames }) =>
      new Promise<{ animations: MorphAnimation[]; calls: number }>((resolve) => {
        const preexisting = new Set<Animation>(document.getAnimations());
        const seen = new Map<Animation, MorphAnimation>();
        const nav = document.querySelector(selector);
        const startedAt = performance.now();
        let idle = 0;
        const describeAnimation = (animation: Animation): MorphAnimation | null => {
          const effect = animation.effect as KeyframeEffect | null;
          if (effect === null || effect.target === null) return null;
          const timing = effect.getComputedTiming();
          if (timing.iterations === Number.POSITIVE_INFINITY) return null;
          const pseudo = effect.pseudoElement ?? "";
          const inScope =
            pseudo.startsWith("::view-transition") ||
            nav?.contains(effect.target) ||
            effect.target.closest("main") !== null;
          if (!inScope) return null;
          const properties = new Set<string>();
          const frames = effect.getKeyframes();
          for (const frame of frames)
            for (const key of Object.keys(frame))
              if (!["offset", "computedOffset", "easing", "composite"].includes(key))
                properties.add(key);
          // CSS animations carry animation-timing-function on their keyframes; the effect
          // easing is then "linear", so read the keyframe easing in that case.
          const effectEasing = String(timing.easing ?? "");
          const frameEasing = String(frames[0]?.easing ?? "linear");
          return {
            target: pseudo || (effect.target as Element).tagName.toLowerCase(),
            durationMs: Number(timing.duration),
            easing: effectEasing === "linear" ? frameEasing : effectEasing,
            properties: [...properties],
          };
        };
        const tick = (): void => {
          let running = false;
          for (const animation of document.getAnimations()) {
            if (preexisting.has(animation)) continue;
            running = true;
            if (!seen.has(animation)) {
              const entry = describeAnimation(animation);
              if (entry !== null) seen.set(animation, entry);
            }
          }
          idle = running ? 0 : idle + 1;
          const elapsed = performance.now() - startedAt;
          if ((idle >= idleFrames && elapsed >= minMs) || elapsed >= cap) {
            resolve({
              animations: [...seen.values()],
              calls: (window as unknown as { __kmMorphCalls?: number }).__kmMorphCalls ?? 0,
            });
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    {
      selector: navSelector,
      cap: OBSERVE_CAP_MS,
      minMs: MIN_OBSERVE_MS,
      idleFrames: IDLE_FRAMES,
    },
  );
  await page.setViewportSize({ width, height });
  const observed = await recording;
  return {
    navClassBefore,
    navClassAfter: await navClassOf(page, navSelector),
    viewTransitionCalls: observed.calls,
    animations: observed.animations,
  };
}

/** The crossing animates with the nav tokens, and only transform/opacity change. */
export function checkMorphTokens(
  observation: MorphObservation,
  expectedClass: string,
  durToken: string,
  easeToken: string,
): ProbeResult {
  const wantMs = cssTimeToMs(tokenValue(durToken));
  const wantEase = normaliseEasing(tokenValue(easeToken));
  const allowedMs = ["dur-nav-morph", "dur-nav-label", "dur-reflow"].map((t) =>
    cssTimeToMs(tokenValue(t)),
  );
  const problems: string[] = [];
  if (observation.navClassAfter !== expectedClass)
    problems.push(`nav class ${observation.navClassAfter} != ${expectedClass}`);
  if (!observation.animations.some((a) => Math.abs(a.durationMs - wantMs) <= 0.5))
    problems.push(`no animation lasts ${durToken} ${wantMs}ms`);
  for (const a of observation.animations) {
    if (!allowedMs.some((ms) => Math.abs(a.durationMs - ms) <= 0.5))
      problems.push(`${a.target} lasts ${a.durationMs}ms, not a nav motion token`);
    if (normaliseEasing(a.easing) !== wantEase)
      problems.push(`${a.target} easing ${a.easing} != ${easeToken}`);
    const layout = a.properties.filter((p) => !COMPOSITOR_ONLY.has(p));
    if (layout.length > 0) problems.push(`${a.target} animates ${layout.join(", ")}`);
  }
  return {
    ok: problems.length === 0,
    detail: problems.join("; ") || JSON.stringify(observation),
  };
}

/** The class changed and nothing animated: reduced motion, or a resize inside one class. */
export function checkInstant(observation: MorphObservation, expectedClass: string): ProbeResult {
  const problems: string[] = [];
  if (observation.navClassAfter !== expectedClass)
    problems.push(`nav class ${observation.navClassAfter} != ${expectedClass}`);
  if (observation.animations.length > 0)
    problems.push(`${observation.animations.length} animation(s) started`);
  return {
    ok: problems.length === 0,
    detail: problems.join("; ") || "instant, no animation",
  };
}
