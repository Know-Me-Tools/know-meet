import type { Locator, Page } from "@playwright/test";
import { cssTimeToMs, normaliseEasing, tokenValue } from "../support/oracle.ts";

export interface ProbeResult {
  readonly ok: boolean;
  readonly detail: string;
}

interface TimingStyle {
  readonly transitionProperty: string;
  readonly transitionDuration: string;
  readonly transitionTimingFunction: string;
  readonly animationDuration: string;
  readonly animationTimingFunction: string;
}

async function timing(target: Locator): Promise<TimingStyle> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
      transitionTimingFunction: style.transitionTimingFunction,
      animationDuration: style.animationDuration,
      animationTimingFunction: style.animationTimingFunction,
    };
  });
}

const list = (value: string): string[] => value.split(/,(?![^(]*\))/).map((part) => part.trim());

/** Every listed transition property uses the duration and easing tokens. */
export async function checkTransitionTokens(
  target: Locator,
  properties: readonly string[],
  durToken: string,
  easeToken: string,
): Promise<ProbeResult> {
  const style = await timing(target);
  const props = list(style.transitionProperty);
  const durations = list(style.transitionDuration);
  const easings = list(style.transitionTimingFunction);
  const wantMs = cssTimeToMs(tokenValue(durToken));
  const wantEase = normaliseEasing(tokenValue(easeToken));
  const problems: string[] = [];
  for (const property of properties) {
    const index = props.indexOf(property);
    if (index < 0) {
      problems.push(
        `${property} is not transitioned (transition-property: ${style.transitionProperty})`,
      );
      continue;
    }
    const ms = cssTimeToMs(durations[index % durations.length] ?? "0s");
    const ease = normaliseEasing(easings[index % easings.length] ?? "");
    if (Math.abs(ms - wantMs) > 0.5)
      problems.push(`${property} duration ${ms}ms != ${durToken} ${wantMs}ms`);
    if (ease !== wantEase) problems.push(`${property} easing ${ease} != ${easeToken} ${wantEase}`);
  }
  return { ok: problems.length === 0, detail: problems.join("; ") || JSON.stringify(style) };
}

/** The element's running animation uses the duration and easing tokens. */
export async function checkAnimationTokens(
  target: Locator,
  durToken: string,
  easeToken: string,
): Promise<ProbeResult> {
  const style = await timing(target);
  const ms = cssTimeToMs(list(style.animationDuration)[0] ?? "0s");
  const ease = normaliseEasing(list(style.animationTimingFunction)[0] ?? "");
  const wantMs = cssTimeToMs(tokenValue(durToken));
  const wantEase = normaliseEasing(tokenValue(easeToken));
  const ok = Math.abs(ms - wantMs) <= 0.5 && ease === wantEase;
  return {
    ok,
    detail: `animation ${ms}ms ${ease}; want ${durToken} ${wantMs}ms ${easeToken} ${wantEase}`,
  };
}

/** Under reduced motion: no element exceeds the dur-reduced-motion token and nothing keeps running. */
export async function checkReducedMotion(page: Page, scope = "*"): Promise<ProbeResult> {
  const maxMs = cssTimeToMs(tokenValue("dur-reduced-motion"));
  const offenders = await page.evaluate(
    ({ selector, limit }) => {
      const toMs = (value: string): number => {
        const amount = Number.parseFloat(value);
        return value.trim().endsWith("ms") ? amount : amount * 1000;
      };
      const out: string[] = [];
      for (const element of Array.from(document.querySelectorAll(selector))) {
        const style = getComputedStyle(element);
        const parts = [
          ...style.transitionDuration.split(","),
          ...(style.animationName === "none" ? [] : style.animationDuration.split(",")),
        ];
        const worst = Math.max(...parts.map(toMs));
        if (worst > limit)
          out.push(`${element.tagName.toLowerCase()}.${element.className}: ${worst}ms`);
      }
      const running = document
        .getAnimations()
        .filter((animation) => animation.playState === "running").length;
      if (running > 0) out.push(`${running} animation(s) still running`);
      return out;
    },
    { selector: scope, limit: maxMs },
  );
  return {
    ok: offenders.length === 0,
    detail: offenders.slice(0, 20).join("\n") || "no motion above the reduced-motion token",
  };
}
