import type { Page } from "@playwright/test";

/**
 * Flat 2.0 whole-page stroke scan (operator: no borders, outlines or strokes anywhere).
 * Unlike flat-controls-probe.ts, which only audits interactive controls, this walks EVERY element
 * and its ::before / ::after in the rendered state and reports:
 *   border     any side with a non-zero width and a style other than none
 *   outline    any outline with a style other than none
 *   shadow     any box-shadow other than none (rings, insets and elevation alike)
 *   rule       an <hr>, or a ::before / ::after whose box is a thin line (<= 4px on one axis)
 *              or that draws a border
 *   deco-text  underline / line-through / overline (informational: reported, never a failure)
 * SVG internals are glyphs, not strokes, and are skipped; the <svg> element itself is scanned.
 */
export interface StrokeFinding {
  readonly kind: "border" | "outline" | "shadow" | "rule" | "deco-text";
  /** Stable selector-ish signature, so repeats collapse to one finding per state. */
  readonly where: string;
  readonly detail: string;
}

export interface StrokeScan {
  readonly elements: number;
  readonly pseudos: number;
  readonly findings: readonly StrokeFinding[];
}

export async function scanAllStrokes(page: Page): Promise<StrokeScan> {
  return page.evaluate(() => {
    const findings: StrokeFinding[] = [];
    const seen = new Set<string>();
    let elements = 0;
    let pseudos = 0;
    const sig = (el: Element, pseudo: string): string => {
      const parts: string[] = [];
      for (let n: Element | null = el, depth = 0; n !== null && depth < 3; n = n.parentElement, depth += 1) {
        const cls = n.classList.length > 0 ? `.${Array.from(n.classList).slice(0, 2).join(".")}` : "";
        parts.unshift(`${n.tagName.toLowerCase()}${n.id ? `#${n.id}` : ""}${cls}`);
      }
      return parts.join(" > ") + pseudo;
    };
    const add = (kind: StrokeFinding["kind"], el: Element, pseudo: string, detail: string): void => {
      const where = sig(el, pseudo);
      const key = `${kind}|${where}|${detail}`;
      if (seen.has(key)) return;
      seen.add(key);
      findings.push({ kind, where, detail });
    };
    const strokes = (el: Element, pseudo: string, style: CSSStyleDeclaration): void => {
      for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
        const width = Number.parseFloat(style[`border${side}Width`]);
        if (width > 0 && style[`border${side}Style`] !== "none" && style[`border${side}Style`] !== "hidden")
          add("border", el, pseudo, `border-${side.toLowerCase()} ${width}px ${style[`border${side}Style`]} ${style[`border${side}Color`]}`);
      }
      if (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0)
        add("outline", el, pseudo, `outline ${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`);
      if (style.boxShadow !== "none") add("shadow", el, pseudo, `box-shadow ${style.boxShadow}`);
    };
    const visible = (style: CSSStyleDeclaration): boolean =>
      style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity) > 0;

    for (const el of Array.from(document.querySelectorAll("body, body *"))) {
      if (el.closest("svg") !== null && el.tagName.toLowerCase() !== "svg") continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const rendered = visible(style) && !(box.width === 0 && box.height === 0);
      if (rendered) {
        elements += 1;
        strokes(el, "", style);
        if (el.tagName === "HR") add("rule", el, "", "<hr>");
        if (style.textDecorationLine !== "none") {
          // Only text-bearing elements: a decoration on a container is inherited by its text.
          const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
          if (hasOwnText) add("deco-text", el, "", style.textDecorationLine);
        }
      }
      for (const pseudo of ["::before", "::after"] as const) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === "none" || ps.content === "normal" || !visible(ps)) continue;
        const w = Number.parseFloat(ps.width);
        const h = Number.parseFloat(ps.height);
        const hasFill = ps.backgroundColor !== "rgba(0, 0, 0, 0)" || ps.backgroundImage !== "none";
        const thin = (Number.isFinite(w) && w > 0 && w <= 4) || (Number.isFinite(h) && h > 0 && h <= 4);
        pseudos += 1;
        strokes(el, pseudo, ps);
        if (hasFill && thin && ps.display !== "inline")
          add("rule", el, pseudo, `${pseudo} ${ps.width} x ${ps.height} filled ${ps.backgroundColor}`);
      }
    }
    return { elements, pseudos, findings };
  });
}
