import type { Page } from "@playwright/test";

/** Flat 2.0 (DESIGN.md, operator decision D-6): fills carry boundary and focus, never strokes. */
export const MIN_FILL_CONTRAST = 3;
const MAX_TAB_STOPS = 40;

/** sRGB triple of a fill as it renders: every translucent layer composited onto the backdrop. */
export type Rgb = readonly [number, number, number];

export interface ControlRest {
  readonly id: number;
  readonly label: string;
  readonly strokes: readonly string[];
  /** Composited fill read before any element is focused (after blurring the initial focus). */
  readonly fill: Rgb;
}

export interface FocusStop {
  readonly id: number;
  readonly label: string;
  readonly strokes: readonly string[];
  /** Lower of the two unfocused readings: before focusing (rest pass) and after blurring. */
  readonly contrastToRest: number;
  readonly contrastToRestPass: number;
  readonly contrastAfterBlur: number;
  readonly contrastToSurface: number;
}

export interface FlatReport {
  readonly controls: number;
  readonly focusStops: number;
  readonly stops: readonly FocusStop[];
  /** Transitions still running after the settle limit (fills read while they ran). */
  readonly unsettled: readonly string[];
  readonly problems: readonly string[];
}

const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), ' +
  '[role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="link"]';

interface KmFlatHelpers {
  composite(element: Element | null): [number, number, number];
  strokes(element: Element, focus: boolean): string[];
  settle(): Promise<string[]>;
}

declare global {
  interface Window {
    __kmFlat?: KmFlatHelpers;
  }
}

/**
 * Installs the in-page helpers once per document. `composite` alpha-composites each translucent
 * background layer from the element up to its first opaque ancestor (the page canvas, white, if
 * none is opaque), as contrast-record.mjs does, so a translucent fill such as `amber-soft` is
 * measured as rendered and never as if it were opaque.
 */
async function installHelpers(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.__kmFlat !== undefined) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const toRgba = (value: string): number[] => {
      if (ctx === null) return [0, 0, 0, 0];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const composite = (element: Element | null): [number, number, number] => {
      const layers: number[][] = [];
      for (let node = element; node !== null; node = node.parentElement) {
        const rgba = toRgba(getComputedStyle(node).backgroundColor);
        if ((rgba[3] ?? 0) === 0) continue;
        layers.push(rgba);
        if (rgba[3] === 255) break;
      }
      let acc: [number, number, number] = [255, 255, 255];
      for (const layer of layers.reverse()) {
        const a = (layer[3] ?? 0) / 255;
        acc = [0, 1, 2].map((i) => (layer[i] ?? 0) * a + acc[i]! * (1 - a)) as [
          number,
          number,
          number,
        ];
      }
      return acc;
    };
    const strokes = (element: Element, focus: boolean): string[] => {
      const style = getComputedStyle(element);
      const out: string[] = [];
      for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
        const width = Number.parseFloat(style[`border${side}Width`]);
        if (width > 0 && style[`border${side}Style`] !== "none")
          out.push(focus ? `border-${side.toLowerCase()}` : `border-${side.toLowerCase()} ${width}px`);
      }
      if (Number.parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== "none")
        out.push(focus ? `outline ${style.outlineWidth} ${style.outlineStyle}` : `outline ${style.outlineWidth}`);
      // A ring is a zero-blur box-shadow with spread (Tailwind ring-*); soft elevation is allowed.
      for (const shadow of style.boxShadow.split(/,(?![^(]*\))/)) {
        const numbers = shadow.match(/-?\d+(\.\d+)?px/g) ?? [];
        if (
          numbers.length >= 4 &&
          Number.parseFloat(numbers[2] ?? "0") === 0 &&
          Number.parseFloat(numbers[3] ?? "0") !== 0
        )
          out.push(`ring ${shadow.trim()}`);
      }
      return out;
    };
    // Settled fills only: a background-color transition (dur-fast) would otherwise be sampled
    // mid-way, on focus and on blur alike. Bounded: a transition still running after
    // SETTLE_LIMIT_MS is returned (and reported) instead of stalling the audit.
    const SETTLE_LIMIT_MS = 2000;
    const settle = async (): Promise<string[]> => {
      const running = document.getAnimations().filter((a) => a instanceof CSSTransition);
      const done = Promise.all(running.map((a) => a.finished.catch(() => undefined)));
      const timedOut = await Promise.race([
        done.then(() => false),
        new Promise<boolean>((r) => setTimeout(() => r(true), SETTLE_LIMIT_MS)),
      ]);
      if (!timedOut) return [];
      return running
        .filter((a) => a.playState === "running" || a.playState === "paused")
        .map((a) => {
          const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
          return `${(a as CSSTransition).transitionProperty} on ${t?.tagName.toLowerCase() ?? "?"}${t?.id ? `#${t.id}` : ""}.${t?.classList.value.replace(/ /g, ".") ?? ""} (${a.playState})`;
        });
    };
    window.__kmFlat = { composite, strokes, settle };
  });
}

/** Blurs whatever the state left focused and waits for its fill to settle. */
async function blurAndSettle(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    (document.activeElement as HTMLElement | null)?.blur();
    return (await window.__kmFlat?.settle()) ?? [];
  });
}

/** Rest pass: tags each visible control with an id and reports strokes and its composited fill. */
async function readRest(page: Page): Promise<ControlRest[]> {
  return page.evaluate((selector) => {
    const km = window.__kmFlat;
    if (km === undefined) throw new Error("flat-controls helpers not installed");
    const out: ControlRest[] = [];
    let id = 0;
    for (const element of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (box.width === 0 || box.height === 0 || style.visibility === "hidden") continue;
      id += 1;
      element.setAttribute("data-km-flat-id", String(id));
      out.push({
        id,
        label: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}[${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 30)}]`,
        strokes: km.strokes(element, false),
        fill: km.composite(element),
      });
    }
    return out;
  }, INTERACTIVE);
}

interface FocusReading {
  readonly id: number;
  readonly strokes: readonly string[];
  readonly fill: Rgb;
  readonly surface: Rgb;
}

/**
 * After a Tab press: settles fills, reads the newly focused control, and reads the fill of every
 * earlier stop that focus has left (no longer containing the active element) — its unfocused fill
 * after blurring.
 */
async function readAfterTab(
  page: Page,
  pending: readonly number[],
): Promise<{
  focus: FocusReading | null;
  blurred: Array<{ id: number; fill: Rgb }>;
  unsettled: string[];
}> {
  return page.evaluate(async (pendingIds) => {
    const km = window.__kmFlat;
    if (km === undefined) throw new Error("flat-controls helpers not installed");
    const unsettled = await km.settle();
    const active = document.activeElement as HTMLElement | null;
    const blurred: Array<{ id: number; fill: [number, number, number] }> = [];
    for (const id of new Set(pendingIds)) {
      const element = document.querySelector(`[data-km-flat-id="${id}"]`);
      if (element === null || (active !== null && element.contains(active))) continue;
      blurred.push({ id, fill: km.composite(element) });
    }
    const id = Number(active?.getAttribute("data-km-flat-id") ?? "0");
    const focus =
      active === null || id === 0 || !active.matches(":focus-visible")
        ? null
        : {
            id,
            strokes: km.strokes(active, true),
            fill: km.composite(active),
            surface: km.composite(active.parentElement),
          };
    return { focus, blurred, unsettled };
  }, pending as number[]);
}

/** Unfocused fills of the stops still pending once focus has left the page. */
async function readRemaining(
  page: Page,
  pending: readonly number[],
): Promise<{ fills: Array<{ id: number; fill: Rgb }>; unsettled: string[] }> {
  const unsettled = await blurAndSettle(page);
  const fills = await page.evaluate((ids) => {
    const km = window.__kmFlat;
    if (km === undefined) throw new Error("flat-controls helpers not installed");
    return [...new Set(ids)].flatMap((id) => {
      const element = document.querySelector(`[data-km-flat-id="${id}"]`);
      return element === null ? [] : [{ id, fill: km.composite(element) }];
    });
  }, pending as number[]);
  return { fills, unsettled };
}

const luminance = ([r, g, b]: Rgb): number => {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

/** WCAG 2.x contrast ratio of two opaque (already composited) colours. */
export function contrastRatio(x: Rgb, y: Rgb): number {
  const [hi, lo] = [luminance(x), luminance(y)].sort((m, n) => n - m) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Rest and keyboard-focus audit of every interactive control currently rendered.
 *
 * Unfocused fills are read twice per stop and the lower contrast counts: once before anything is
 * focused (the state's initial focus is blurred first, so a state rendered with focus, such as
 * `frame.skip-link-focused`, still yields a true rest fill) and once after focus has left the
 * control. All fills are composited over their backdrop before contrast is computed.
 */
export async function auditFlatControls(page: Page): Promise<FlatReport> {
  await installHelpers(page);
  const unsettled = new Set(await blurAndSettle(page));
  const rest = await readRest(page);
  const byId = new Map(rest.map((control) => [control.id, control]));
  const problems = rest
    .filter((control) => control.strokes.length > 0)
    .map((control) => `rest ${control.label}: ${control.strokes.join(", ")}`);

  const visits: FocusReading[] = [];
  const afterBlur = new Map<number, Map<number, Rgb>>(); // visit index -> id -> fill
  let pending: Array<{ visit: number; id: number }> = [];
  const resolve = (fills: ReadonlyArray<{ id: number; fill: Rgb }>): void => {
    const byElement = new Map(fills.map((f) => [f.id, f.fill]));
    pending = pending.filter(({ visit, id }) => {
      const fill = byElement.get(id);
      if (fill === undefined) return true;
      afterBlur.set(visit, new Map([[id, fill]]));
      return false;
    });
  };

  for (let index = 0; index < MAX_TAB_STOPS; index += 1) {
    await page.keyboard.press("Tab");
    const { focus, blurred, unsettled: running } = await readAfterTab(
      page,
      pending.map((p) => p.id),
    );
    resolve(blurred);
    for (const u of running) unsettled.add(u);
    if (focus === null || !byId.has(focus.id)) continue;
    pending.push({ visit: visits.length, id: focus.id });
    visits.push(focus);
  }
  const remaining = await readRemaining(
    page,
    pending.map((p) => p.id),
  );
  resolve(remaining.fills);
  for (const u of remaining.unsettled) unsettled.add(u);
  for (const u of unsettled) problems.push(`unsettled transition ${u}: fills read while it ran`);

  const stops: FocusStop[] = [];
  visits.forEach((visit, index) => {
    const before = byId.get(visit.id);
    if (before === undefined) return;
    const blurFill = afterBlur.get(index)?.get(visit.id);
    const contrastToRestPass = contrastRatio(visit.fill, before.fill);
    const contrastAfterBlur = blurFill === undefined ? contrastToRestPass : contrastRatio(visit.fill, blurFill);
    const stop: FocusStop = {
      id: visit.id,
      label: before.label,
      strokes: visit.strokes,
      contrastToRest: Math.min(contrastToRestPass, contrastAfterBlur),
      contrastToRestPass,
      contrastAfterBlur,
      contrastToSurface: contrastRatio(visit.fill, visit.surface),
    };
    stops.push(stop);
    if (stop.strokes.length > 0) problems.push(`focus ${stop.label}: ${stop.strokes.join(", ")}`);
    if (stop.contrastToRest < MIN_FILL_CONTRAST)
      problems.push(`focus ${stop.label}: fill changes by only ${stop.contrastToRest.toFixed(2)}:1`);
    if (stop.contrastToSurface < MIN_FILL_CONTRAST)
      problems.push(`focus ${stop.label}: ${stop.contrastToSurface.toFixed(2)}:1 against surface`);
  });
  return {
    controls: rest.length,
    focusStops: stops.length,
    stops,
    unsettled: [...unsettled],
    problems,
  };
}
