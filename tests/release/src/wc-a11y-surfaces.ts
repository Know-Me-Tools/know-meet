/**
 * WC-13 probes (automated half). Extends a11y-probes.ts (WR-8) with what WC-13
 * adds to the oracle:
 * - axe-core at WCAG 2.2 A/AA with the failing selectors kept, so a finding
 *   can be traced to a surface, a width and a theme;
 * - a stroke scan (DESIGN.md Flat 2.0): borders, outlines, ring shadows and
 *   <hr> on every rendered element and its ::before/::after. SVG icon strokes
 *   are glyph drawing, not surface strokes, and are skipped. Soft box-shadows
 *   are listed separately because the WC-13 oracle names borders and outlines;
 *   the report carries them for the UI reviewer;
 * - the WR-8 control fill probe (SC 1.4.11 through fill), with DESIGN.md D-6:
 *   buttons and links identified by visible text are recorded, not failed;
 * - room geometry (wc-room-layout.ts): bar pinned to the viewport, sheet full height;
 * - running animations under prefers-reduced-motion;
 * - Tab reachability with a fill-only focus change of at least 3:1, read where focus
 *   settles (Base UI focus guards hand focus on one animation frame later).
 * Cells are audited once running finite animations end (the state a person sees),
 * and captured at viewport size, as on screen.
 * In-page functions are self-contained because Playwright serialises them.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Browser, Page, TestInfo } from "@playwright/test";
import {
  type FillMeasure,
  fillMeasures,
  fillProblems,
  focusStopProblems,
  readFocusStop,
  WCAG_TAGS,
} from "./a11y-probes.ts";
import { STORAGE } from "./test-ids.ts";
import { contextDefaults, newParticipant, type Participant } from "./wc-room.ts";
import { roomLayoutProblems } from "./wc-room-layout.ts";

export type Theme = "dark" | "light";
export const THEMES: readonly Theme[] = ["dark", "light"];
export const VIEWPORTS: ReadonlyArray<{ width: number; height: number }> = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];
export const DESKTOP = { width: 1440, height: 900 } as const;
/** Longest animation or transition tolerated under prefers-reduced-motion, in ms. */
const REDUCED_MOTION_MAX_MS = 1;
const MAX_TAB_STOPS = 60;
const MAX_STROKES_PER_CELL = 200;
/** Longest wait for running finite animations to end before a cell is audited, ms. */
const ANIMATION_SETTLE_MAX_MS = 2000;

export async function themedParticipant(
  browser: Browser,
  name: string,
  theme: Theme,
  testInfo: TestInfo,
  baseURL: string | undefined,
  reducedMotion: "reduce" | "no-preference" = "no-preference",
): Promise<Participant> {
  const participant = await newParticipant(browser, name, testInfo, {
    contextOptions: {
      ...contextDefaults(baseURL),
      colorScheme: theme,
      reducedMotion,
    },
  });
  await participant.context.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORAGE.theme, value: theme },
  );
  return participant;
}

export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    );
  });
}

/**
 * Waits for running finite animations and transitions to end (capped), so axe and the
 * fill probe read final colours, not a dialog half way through its fade. Infinite
 * animations are left running. Not used by the reduced-motion check, which must see
 * what is still moving.
 */
async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(async (maxMs) => {
    const finite = document
      .getAnimations()
      .filter(
        (a) =>
          a.playState === "running" &&
          Number(a.effect?.getComputedTiming().iterations ?? 1) !== Number.POSITIVE_INFINITY,
      )
      .map((a) => a.finished.catch(() => undefined));
    await Promise.race([Promise.all(finite), new Promise<void>((done) => setTimeout(done, maxMs))]);
  }, ANIMATION_SETTLE_MAX_MS);
}

export interface AxeNode {
  readonly target: string;
  readonly html: string;
  readonly summary: string;
}

export interface AxeViolation {
  readonly id: string;
  readonly impact: string;
  readonly help: string;
  readonly nodes: readonly AxeNode[];
}

export async function axeViolations(page: Page): Promise<AxeViolation[]> {
  const report = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return report.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? "unknown",
    help: v.help,
    nodes: v.nodes.map((node) => ({
      target: node.target
        .map((part) => (Array.isArray(part) ? part.join(" >>> ") : String(part)))
        .join(" "),
      html: node.html.slice(0, 200),
      summary: (node.failureSummary ?? "").slice(0, 300),
    })),
  }));
}

export interface Stroke {
  readonly element: string;
  /** border | outline | ring | rule fail the oracle; shadow is reported only. */
  readonly kind: "border" | "outline" | "ring" | "rule" | "shadow";
  readonly value: string;
}

/** Every stroke-like paint on rendered elements and their pseudo-elements. Runs in the page. */
function strokeScanInPage(limit: number): Stroke[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) throw new Error("no 2d canvas context");
  const alpha = (css: string): number => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    return (ctx.getImageData(0, 0, 1, 1).data[3] ?? 0) / 255;
  };
  const describeElement = (el: Element): string => {
    const own = el.getAttribute("data-testid");
    if (own !== null) return own;
    const cls =
      typeof el.className === "string"
        ? el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    const near = el.parentElement?.closest("[data-testid]")?.getAttribute("data-testid");
    return `${el.tagName.toLowerCase()}${cls === "" ? "" : `.${cls}`}${near ? ` in ${near}` : ""}`;
  };
  const out: Stroke[] = [];
  const check = (el: Element, style: CSSStyleDeclaration, pseudo: string): void => {
    const where = `${describeElement(el)}${pseudo}`;
    for (const side of ["top", "right", "bottom", "left"]) {
      const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`));
      const kind = style.getPropertyValue(`border-${side}-style`);
      const color = style.getPropertyValue(`border-${side}-color`);
      if (width > 0 && kind !== "none" && kind !== "hidden" && alpha(color) > 0) {
        out.push({
          element: where,
          kind: "border",
          value: `${side} ${width}px ${kind} ${color}`,
        });
        break;
      }
    }
    const outline = Number.parseFloat(style.outlineWidth);
    if (style.outlineStyle !== "none" && outline > 0 && alpha(style.outlineColor) > 0) {
      out.push({
        element: where,
        kind: "outline",
        value: `${outline}px ${style.outlineStyle} ${style.outlineColor}`,
      });
    }
    if (style.boxShadow !== "none" && style.boxShadow !== "") {
      for (const shadow of style.boxShadow.split(/,(?![^(]*\))/)) {
        const color = shadow.match(/(rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)/)?.[0] ?? "";
        if (color !== "" && alpha(color) === 0) continue;
        const px = shadow.match(/-?\d+(\.\d+)?px/g) ?? [];
        const ring =
          px.length >= 4 &&
          Number.parseFloat(px[2] ?? "0") === 0 &&
          Number.parseFloat(px[3] ?? "0") !== 0;
        out.push({
          element: where,
          kind: ring ? "ring" : "shadow",
          value: shadow.trim(),
        });
      }
    }
  };
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (out.length >= limit) break;
    if (el.closest("svg") !== null) continue;
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (box.width === 0 || box.height === 0 || style.visibility === "hidden") continue;
    if (el.tagName === "HR")
      out.push({ element: describeElement(el), kind: "rule", value: "<hr>" });
    check(el, style, "");
    for (const pseudo of ["::before", "::after"]) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content === "none" || ps.content === "normal") continue;
      check(el, ps, pseudo);
    }
  }
  return out;
}

export async function strokeScan(page: Page): Promise<Stroke[]> {
  return page.evaluate(strokeScanInPage, MAX_STROKES_PER_CELL);
}

export interface SurfaceAudit {
  readonly axe: readonly AxeViolation[];
  readonly fills: readonly FillMeasure[];
  readonly strokes: readonly Stroke[];
  /** Empty when the cell passes axe, the stroke scan and the fill probe. */
  readonly problems: readonly string[];
}

export async function auditSurface(page: Page): Promise<SurfaceAudit> {
  const axe = await axeViolations(page);
  const fills = await fillMeasures(page, { exemptTextIdentified: true });
  const strokes = await strokeScan(page);
  const layout = await roomLayoutProblems(page);
  const problems = [
    ...axe.flatMap((v) => v.nodes.map((n) => `axe ${v.id} (${v.impact}) at ${n.target}`)),
    ...strokes
      .filter((s) => s.kind !== "shadow")
      .map((s) => `stroke ${s.kind} ${s.element}: ${s.value}`),
    ...fillProblems(fills),
    ...layout,
  ];
  return { axe, fills, strokes, problems };
}

/** Audits the current state at every width, screenshot per cell; returns cells keyed surface/theme/width. */
export async function auditAllWidths(
  page: Page,
  surface: string,
  theme: Theme,
  testInfo: TestInfo,
  prepare?: () => Promise<void>,
): Promise<Record<string, SurfaceAudit>> {
  const cells: Record<string, SurfaceAudit> = {};
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await settle(page);
    if (prepare !== undefined) await prepare();
    // The pointer stays where the last click left it; a hover fill is not the resting state
    // the audit measures (r8: the playback button's hover fill at 1440). Park it off content.
    await page.mouse.move(0, 0);
    await settleAnimations(page);
    cells[`${surface}/${theme}/${viewport.width}`] = await auditSurface(page);
    const name = `wc-13-${surface}-${theme}-${viewport.width}`;
    const path = testInfo.outputPath(`${name}.png`);
    await page.screenshot({ path });
    await testInfo.attach(name, { path, contentType: "image/png" });
  }
  await page.setViewportSize(DESKTOP);
  return cells;
}

/** Animations or transitions still running that exceed the reduced-motion allowance. */
export async function longAnimations(page: Page, surface: string): Promise<string[]> {
  await settle(page);
  const long = await page.evaluate(
    (maxMs) =>
      document
        .getAnimations()
        .filter((animation) => animation.playState === "running")
        .map((animation) => {
          const timing = animation.effect?.getComputedTiming();
          const duration = Number(timing?.duration ?? 0);
          const name =
            "animationName" in animation
              ? String(animation.animationName)
              : "transitionProperty" in animation
                ? String(animation.transitionProperty)
                : "script";
          const target =
            animation.effect instanceof KeyframeEffect && animation.effect.target !== null
              ? (animation.effect.target.getAttribute("data-testid") ??
                animation.effect.target.tagName.toLowerCase())
              : "?";
          return {
            name,
            target,
            duration,
            iterations: Number(timing?.iterations ?? 1),
          };
        })
        .filter((a) => !(a.duration <= maxMs) || a.iterations === Number.POSITIVE_INFINITY)
        .map((a) => `${a.name} on ${a.target} ${a.duration}ms x${a.iterations}`),
    REDUCED_MOTION_MAX_MS,
  );
  return long.map((entry) => `${surface}: ${entry}`);
}

/** A control found by test id, or by role and exact accessible name. */
export type Target = string | { readonly role: "button" | "link"; readonly name: string };

function targetLabel(target: Target): string {
  return typeof target === "string" ? target : `${target.role} "${target.name}"`;
}

/**
 * Presses Tab until every target has had focus (any order), checking every stop
 * (name, no ring, 3:1 fill change). An unreached target is recorded, not thrown,
 * so the rest of the keyboard tour still runs.
 */
export async function tabThrough(
  page: Page,
  targets: readonly Target[],
  problems: string[],
  label: string,
): Promise<void> {
  const pending = new Map(targets.map((t) => [targetLabel(t), t]));
  for (let i = 0; i < MAX_TAB_STOPS && pending.size > 0; i += 1) {
    await page.keyboard.press("Tab");
    await settle(page);
    const stop = await readFocusStop(page);
    if (stop === null) continue;
    problems.push(...focusStopProblems(stop).map((p) => `${label}: ${p}`));
    for (const [key, target] of pending) {
      const hit = typeof target === "string" ? stop.testId === target : stop.name === target.name;
      if (hit) pending.delete(key);
    }
  }
  if (pending.size > 0) {
    problems.push(
      `${label}: not reached by Tab within ${MAX_TAB_STOPS} stops: ${[...pending.keys()].join(", ")}`,
    );
  }
}

/** Focuses a control and operates it with a key. */
export async function pressOn(page: Page, target: Target, key: string): Promise<void> {
  const locator =
    typeof target === "string"
      ? page.getByTestId(target)
      : page.getByRole(target.role, { name: target.name, exact: true });
  await locator.focus();
  await page.keyboard.press(key);
}
