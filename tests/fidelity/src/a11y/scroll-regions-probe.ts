import type { Page } from "@playwright/test";
import { MIN_FILL_CONTRAST } from "./flat-controls-probe.ts";

/**
 * Scrollable table regions (prototype km.js markScrollRegions, RV-21): a `.table-wrap` whose content
 * overflows horizontally must be a named, keyboard-focusable region, and its focus is a fill change
 * (D-6), not a stroke. This probe is deliberately uncapped (the flat-controls audit stops at 40 tab
 * stops, which a long page can exhaust before it reaches a table).
 */
const SCROLL_REGION = ".table-wrap";
const MAX_TAB_STOPS = 300;

export interface ScrollRegionReport {
  readonly overflowing: number;
  readonly focused: number;
  readonly problems: readonly string[];
}

interface RegionFacts {
  readonly index: number;
  readonly label: string;
  readonly overflows: boolean;
  readonly tabindex: string | null;
  readonly role: string | null;
  readonly name: string;
}

export async function auditScrollRegions(page: Page): Promise<ScrollRegionReport> {
  // markScrollRegions runs on the next animation frame after load/resize/mutation.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const facts: RegionFacts[] = await page.evaluate((selector) => {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).map((el, index) => {
      el.setAttribute("data-km-region-probe", String(index));
      const caption = el.querySelector("caption")?.textContent?.trim() ?? "";
      return {
        index,
        label: `${el.tagName.toLowerCase()}.${el.className}[${caption || index}]`,
        overflows: el.scrollWidth > el.clientWidth + 1,
        tabindex: el.getAttribute("tabindex"),
        role: el.getAttribute("role"),
        name: (el.getAttribute("aria-label") ?? "").trim(),
      };
    });
  }, SCROLL_REGION);

  const problems: string[] = [];
  const overflowing = facts.filter((f) => f.overflows);
  for (const f of overflowing) {
    if (f.tabindex !== "0") problems.push(`scroll ${f.label}: overflows but is not keyboard focusable`);
    if (f.role !== "region") problems.push(`scroll ${f.label}: overflows but has no region role`);
    if (f.name.length === 0) problems.push(`scroll ${f.label}: overflows but has no accessible name`);
  }
  for (const f of facts.filter((x) => !x.overflows && x.tabindex !== null))
    problems.push(`scroll ${f.label}: fits its container but is still a tab stop`);

  const wanted = new Set(overflowing.filter((f) => f.tabindex === "0").map((f) => f.index));
  const rest = await page.evaluate(() => {
    const walk = (element: Element): string => {
      for (let n: Element | null = element; n !== null; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
      }
      return "rgb(0, 0, 0)";
    };
    const out: Record<string, string> = {};
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-km-region-probe]")))
      out[el.getAttribute("data-km-region-probe") ?? ""] = walk(el);
    return out;
  });

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let focused = 0;
  const seen = new Set<number>();
  for (let step = 0; step < MAX_TAB_STOPS && seen.size < wanted.size; step += 1) {
    await page.keyboard.press("Tab");
    await page.evaluate(() =>
      Promise.all(
        (document.activeElement?.getAnimations() ?? [])
          .filter((a) => a instanceof CSSTransition)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const raw = el?.getAttribute("data-km-region-probe");
      if (el === null || raw === null || raw === undefined) return null;
      const style = getComputedStyle(el);
      const strokes: string[] = [];
      if (Number.parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== "none") strokes.push("outline");
      for (const side of ["Top", "Right", "Bottom", "Left"] as const)
        if (Number.parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== "none")
          strokes.push(`border-${side.toLowerCase()}`);
      for (const shadow of style.boxShadow.split(/,(?![^(]*\))/)) {
        const px = shadow.match(/-?\d+(\.\d+)?px/g) ?? [];
        if (px.length >= 4 && Number.parseFloat(px[2] ?? "0") === 0 && Number.parseFloat(px[3] ?? "0") !== 0)
          strokes.push("ring");
      }
      const own = style.backgroundColor;
      const surface = (() => {
        for (let n: Element | null = el.parentElement; n !== null; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
        }
        return "rgb(0, 0, 0)";
      })();
      return { index: Number(raw), strokes, own, surface, visible: el.matches(":focus-visible") };
    });
    if (stop === null || seen.has(stop.index)) continue;
    seen.add(stop.index);
    focused += 1;
    const f = facts.find((x) => x.index === stop.index);
    const label = f?.label ?? String(stop.index);
    if (!stop.visible) problems.push(`scroll ${label}: focused by keyboard but not :focus-visible`);
    if (stop.strokes.length > 0) problems.push(`scroll ${label}: focus draws ${stop.strokes.join(", ")}`);
    const ratios = await page.evaluate(
      ({ a, b, c }) => {
        const toRgba = (value: string): number[] => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx === null) return [0, 0, 0, 0];
          ctx.fillStyle = value;
          ctx.fillRect(0, 0, 1, 1);
          return Array.from(ctx.getImageData(0, 0, 1, 1).data);
        };
        const lum = (value: string): number => {
          const [r = 0, g = 0, bl = 0] = toRgba(value).map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
        };
        const ratio = (x: string, y: string): number => {
          const [hi, lo] = [lum(x), lum(y)].sort((m, n) => n - m) as [number, number];
          return (hi + 0.05) / (lo + 0.05);
        };
        return [ratio(a, b), ratio(a, c)] as const;
      },
      { a: stop.own, b: rest[String(stop.index)] ?? stop.surface, c: stop.surface },
    );
    const [toRest, toSurface] = ratios;
    if (toRest < MIN_FILL_CONTRAST) problems.push(`scroll ${label}: focus fill changes by only ${toRest.toFixed(2)}:1`);
    if (toSurface < MIN_FILL_CONTRAST) problems.push(`scroll ${label}: focus fill ${toSurface.toFixed(2)}:1 against surface`);
  }
  for (const index of wanted)
    if (!seen.has(index)) problems.push(`scroll ${facts.find((f) => f.index === index)?.label}: not reachable by Tab`);
  return { overflowing: overflowing.length, focused, problems };
}
