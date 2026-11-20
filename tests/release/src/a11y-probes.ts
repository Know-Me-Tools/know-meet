/**
 * Accessibility probes for WR-8 (automated part).
 * - axe-core at WCAG 2.2 A/AA.
 * - Control fill contrast (SC 1.4.11 through fill, the Flat 2.0 rule): every
 *   control that paints its own fill contrasts at least 3:1 with the surface
 *   behind it. axe-core does not test non-text contrast, so this probe is what
 *   makes the WR-8 negative control discriminate.
 * - Focus by fill: no outline or ring, and the focused fill contrasts at least
 *   3:1 with the rest fill.
 * In-page functions are self-contained because Playwright serialises them.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
export const MIN_NON_TEXT_CONTRAST = 3;
export const CONTROL_SELECTOR =
  'button, input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"]';

export interface AxeFinding {
  readonly id: string;
  readonly impact: string;
  readonly nodes: number;
}

export async function axeFindings(page: Page): Promise<AxeFinding[]> {
  const report = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return report.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? "unknown",
    nodes: v.nodes.length,
  }));
}

export interface FillMeasure {
  readonly control: string;
  readonly fill: string;
  readonly surface: string;
  readonly ratio: number;
  /** Set when the control is exempt from the boundary rule; such a measure never fails. */
  readonly exempt?: "text-identified";
}

export interface FillOptions {
  /**
   * DESIGN.md "Text-identified components" (owner decision D-6): a button or link whose
   * visible text identifies it needs no boundary (W3C Understanding 1.4.11), so it is
   * measured and recorded but not failed. Inputs, selects, switches and controls whose
   * label is visually hidden still need a 3:1 fill. Off by default (WR-8 keeps its rule).
   */
  readonly exemptTextIdentified?: boolean;
}

/** Measures every visible control that paints a fill of its own. Runs in the page. */
function measureFillsInPage(args: {
  selector: string;
  exemptTextIdentified: boolean;
}): FillMeasure[] {
  const { selector, exemptTextIdentified } = args;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) throw new Error("no 2d canvas context");
  type Rgba = [number, number, number, number];
  // Any CSS colour (rgb, oklch, color()) -> sRGB bytes, through the canvas.
  const toRgba = (css: string): Rgba => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top: Rgba, bottom: Rgba): Rgba => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    const mix = (i: 0 | 1 | 2): number =>
      (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
    return [mix(0), mix(1), mix(2), a];
  };
  const surfaceBehind = (element: Element | null): Rgba => {
    const layers: Rgba[] = [];
    for (let node = element; node !== null; node = node.parentElement) {
      const layer = toRgba(getComputedStyle(node).backgroundColor);
      layers.push(layer);
      if (layer[3] === 1) break;
    }
    return layers.reduceRight<Rgba>((acc, layer) => over(layer, acc), [255, 255, 255, 1]);
  };
  const luminance = ([r, g, b]: Rgba): number => {
    const channel = (v: number): number => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (x: Rgba, y: Rgba): number => {
    const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };
  // True when the control shows text on screen (a visually hidden label does not count).
  const showsText = (element: Element): boolean => {
    if (!element.matches('button, a[href], [role="button"], [role="link"]')) return false;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if ((node.textContent ?? "").trim() === "") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (box.width > 2 && box.height > 2) return true;
    }
    return false;
  };
  const css = (c: Rgba): string => `rgba(${c.map((v) => Math.round(v * 100) / 100).join(",")})`;
  const out: FillMeasure[] = [];
  for (const element of Array.from(document.querySelectorAll(selector))) {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (box.width === 0 || box.height === 0 || style.visibility === "hidden") continue;
    const own = toRgba(style.backgroundColor);
    if (own[3] === 0) continue;
    const surface = surfaceBehind(element.parentElement);
    const fill = over(own, surface);
    const label =
      element.getAttribute("data-testid") ??
      `${element.tagName.toLowerCase()} "${(element.textContent ?? "").trim().slice(0, 30)}"`;
    out.push({
      control: label,
      fill: css(fill),
      surface: css(surface),
      ratio: ratio(fill, surface),
      ...(exemptTextIdentified && showsText(element) ? { exempt: "text-identified" as const } : {}),
    });
  }
  return out;
}

export async function fillMeasures(page: Page, options: FillOptions = {}): Promise<FillMeasure[]> {
  return page.evaluate(measureFillsInPage, {
    selector: CONTROL_SELECTOR,
    exemptTextIdentified: options.exemptTextIdentified ?? false,
  });
}

export function fillProblems(measures: readonly FillMeasure[]): string[] {
  return measures
    .filter((m) => m.exempt === undefined && m.ratio < MIN_NON_TEXT_CONTRAST)
    .map((m) => `fill-contrast ${m.control}: ${m.ratio.toFixed(2)}:1 (${m.fill} on ${m.surface})`);
}

export interface CellAudit {
  readonly axe: AxeFinding[];
  readonly fills: FillMeasure[];
  /** Empty when the cell passes both axe and the fill probe. */
  readonly problems: string[];
}

export async function auditCell(page: Page): Promise<CellAudit> {
  const axe = await axeFindings(page);
  const fills = await fillMeasures(page);
  const problems = [
    ...axe.map((f) => `axe ${f.id} (${f.impact}, ${f.nodes} nodes)`),
    ...fillProblems(fills),
  ];
  return { axe, fills, problems };
}

export interface FocusStop {
  readonly testId: string;
  readonly name: string;
  readonly ring: boolean;
  readonly focusedFill: string;
  readonly restFill: string;
  readonly ratio: number;
}

/**
 * Reads the focused element, then blurs it to read its rest fill and focuses
 * it again, so the next Tab continues from the same place. Runs in the page.
 * Transitions are disabled by the caller so both reads are final values.
 */
function readFocusStopInPage(): FocusStop | null {
  const element = document.activeElement as HTMLElement | null;
  if (element === null || element === document.body) return null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) throw new Error("no 2d canvas context");
  const toRgb = (css: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a];
  };
  const effectiveFill = (node: HTMLElement): [number, number, number] => {
    // First opaque-enough background up the tree; soft fills are blended over it.
    const layers: Array<[number, number, number, number]> = [];
    for (let n: HTMLElement | null = node; n !== null; n = n.parentElement) {
      const layer = toRgb(getComputedStyle(n).backgroundColor);
      layers.push(layer);
      if (layer[3] === 255) break;
    }
    return layers.reduceRight<[number, number, number]>(
      (acc, [r, g, b, a]) => {
        const t = a / 255;
        return [r * t + acc[0] * (1 - t), g * t + acc[1] * (1 - t), b * t + acc[2] * (1 - t)];
      },
      [255, 255, 255],
    );
  };
  const lum = (rgb: [number, number, number]): number =>
    rgb
      .map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, c, i) => sum + c * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);
  const style = getComputedStyle(element);
  const ringShadow = style.boxShadow.split(/,(?![^(]*\))/).some((shadow) => {
    const px = shadow.match(/-?\d+(\.\d+)?px/g) ?? [];
    return (
      px.length >= 4 &&
      Number.parseFloat(px[2] ?? "0") === 0 &&
      Number.parseFloat(px[3] ?? "0") !== 0
    );
  });
  const ring =
    (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) || ringShadow;
  const focused = effectiveFill(element);
  element.blur();
  const rest = effectiveFill(element);
  element.focus();
  const [hi, lo] = [lum(focused), lum(rest)].sort((p, q) => q - p) as [number, number];
  const labelledBy = element.getAttribute("aria-labelledby");
  const labels = "labels" in element ? (element as HTMLInputElement).labels : null;
  const name =
    (element.getAttribute("aria-label") ?? "").trim() ||
    (labelledBy === null ? "" : (document.getElementById(labelledBy)?.textContent ?? "").trim()) ||
    (labels !== null && labels.length > 0 ? (labels[0]?.textContent ?? "").trim() : "") ||
    (element.textContent ?? "").trim() ||
    (element.getAttribute("title") ?? "").trim();
  return {
    testId: element.getAttribute("data-testid") ?? element.tagName.toLowerCase(),
    name,
    ring,
    focusedFill: `rgb(${focused.map(Math.round).join(",")})`,
    restFill: `rgb(${rest.map(Math.round).join(",")})`,
    ratio: (hi + 0.05) / (lo + 0.05),
  };
}

/** Disables CSS transitions so fill reads are final values. Measurement aid only. */
export async function freezeTransitions(page: Page): Promise<void> {
  await page.addStyleTag({
    content: "*,*::before,*::after{transition:none!important}",
  });
}

export async function readFocusStop(page: Page): Promise<FocusStop | null> {
  return page.evaluate(readFocusStopInPage);
}

export function focusStopProblems(stop: FocusStop): string[] {
  const problems: string[] = [];
  if (stop.name === "") problems.push(`focus ${stop.testId}: no accessible name`);
  if (stop.ring) problems.push(`focus ${stop.testId}: outline or ring`);
  if (stop.ratio < MIN_NON_TEXT_CONTRAST) {
    const change = `${stop.restFill} -> ${stop.focusedFill}`;
    problems.push(`focus ${stop.testId}: fill change ${stop.ratio.toFixed(2)}:1 (${change})`);
  }
  return problems;
}
