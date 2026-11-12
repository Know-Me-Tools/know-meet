/**
 * Runs the nav-morph, no-stroke (Flat 2.0), focus-fill and scroll-region probes against the
 * prototype served read-only. Evidence only: reads docs/design, writes nothing.
 *
 *   node tests/fidelity/src/cli/prototype-probes.ts [morph|flat|strokes|scroll|overflow|controls]...
 *
 * `controls` runs the focus-fill negative controls: the same audit must still report a genuinely
 * failing translucent focus fill and a skip link whose focus fill equals its rest fill.
 */
import { chromium } from "@playwright/test";
import { auditFlatControls, contrastRatio, type Rgb } from "../a11y/flat-controls-probe.ts";
import { scanAllStrokes } from "../a11y/all-elements-stroke-probe.ts";
import { auditScrollRegions } from "../a11y/scroll-regions-probe.ts";
import { startStaticServer } from "../capture/static-server.ts";
import { checkInstant, checkMorphTokens, observeResize } from "../motion/nav-morph-probe.ts";
import { contextOptions, prepareContext } from "../support/capture-environment.ts";
import { findEntry, inScopeEntries, loadInventory, type Theme } from "../support/inventory.ts";
import { DESIGN_DIR, FONTS_DIR } from "../support/repo-paths.ts";
import { renderCell } from "../support/render-cell.ts";
import { PROTOTYPE_SELECTORS, prototypeStatePath, type RenderTarget } from "../support/state-drivers.ts";

const which = new Set(process.argv.slice(2));
const run = (name: string): boolean =>
  which.size === 0 ? name !== "controls" : which.has(name);
const THEMES: readonly Theme[] = ["dark", "light"];
const VIEWPORTS = [375, 768, 1024, 1440] as const;
// The prototype keeps data-nav-class on <html>; the probe scope is then the whole page (stricter).
const NAV = "html";
const failures: string[] = [];

const server = await startStaticServer(DESIGN_DIR, FONTS_DIR);
const browser = await chromium.launch();
const target: RenderTarget = {
  name: "prototype",
  urlFor: (entry) => `${server.origin}/${prototypeStatePath(entry)}`,
  selector: (role) => PROTOTYPE_SELECTORS[role],
};
const inventory = loadInventory();

try {
  if (run("morph")) {
    const cases = [
      { from: 1440, to: 1000, cls: "rail", reduce: false },
      { from: 1024, to: 1023, cls: "rail", reduce: false },
      { from: 1000, to: 500, cls: "bar", reduce: false },
      { from: 600, to: 599, cls: "bar", reduce: false },
      { from: 1440, to: 1100, cls: "inline", reduce: false, instant: true },
      { from: 1440, to: 1000, cls: "rail", reduce: true, instant: true },
    ];
    for (const c of cases) {
      const context = await browser.newContext({
        ...contextOptions(1440),
        viewport: { width: c.from, height: 900 },
        reducedMotion: c.reduce ? "reduce" : "no-preference",
      });
      await prepareContext(context, {
        theme: "dark",
        access: "guest",
        allowedOrigin: server.origin,
        fontBaseUrl: `${server.origin}/__fonts`,
        blocked: [],
      });
      const page = await context.newPage();
      await page.goto(`${server.origin}/prototype/index.html`);
      await page.waitForLoadState("networkidle");
      const obs = await observeResize(page, NAV, c.to, 900);
      const result =
        "instant" in c && c.instant
          ? checkInstant(obs, c.cls)
          : checkMorphTokens(obs, c.cls, "dur-nav-morph", "ease-layout");
      console.log(`morph ${c.from}->${c.to} ${c.cls}${c.reduce ? " reduced" : ""}: ${result.ok ? "PASS" : "FAIL"} ${result.detail}`);
      if (!result.ok) failures.push(`morph ${c.from}->${c.to}`);
      await context.close();
    }
  }
  if (run("controls")) {
    // NC-1: a translucent focus fill (white at 6%) composites to < 3:1 over every dark backdrop.
    // Read as opaque white it would pass (that was the probe defect behind RV-24/RV-26).
    const translucent = "rgba(255, 255, 255, 0.06)";
    const opaqueWhite: Rgb = [255, 255, 255];
    for (const id of ["index.default", "settings.delivery"]) {
      const cell = await renderCell(browser, target, findEntry(inventory, id), "dark", 1440);
      if (cell === null) throw new Error(`NC-1: ${id} not applicable`);
      try {
        await cell.page.addStyleTag({
          // :is() with an id argument outranks the prototype's own !important focus rules.
          content: `:is(#km-nc, *):focus-visible{background:${translucent} !important}`,
        });
        const r = await auditFlatControls(cell.page);
        const reported = r.stops.filter((s) => s.contrastToRest < 3 || s.contrastToSurface < 3);
        const opaquePass = r.stops.filter((s) => s.contrastToSurface < 3).length;
        const ok = r.focusStops > 0 && reported.length === r.focusStops;
        console.log(
          `controls NC-1 translucent focus fill ${id}/dark/1440: ${ok ? "PASS" : "FAIL"} ` +
            `${reported.length}/${r.focusStops} stops reported (${opaquePass} below 3:1 against surface); ` +
            `opaque reading of the same fill against black would be ${contrastRatio(opaqueWhite, [0, 0, 0]).toFixed(2)}:1`,
        );
        if (!ok) failures.push(`controls NC-1 ${id}`);
      } finally {
        await cell.context.close();
      }
    }
    // NC-2: frame.skip-link-focused is rendered with the skip link focused. Unchanged, it must pass;
    // with its focus fill pinned to its rest fill (ember-btn) it must be reported.
    for (const pinned of [false, true]) {
      const cell = await renderCell(browser, target, findEntry(inventory, "frame.skip-link-focused"), "dark", 1440);
      if (cell === null) throw new Error("NC-2: frame.skip-link-focused not applicable");
      try {
        const focusedAtRender = await cell.page.evaluate(
          () => document.activeElement?.classList.contains("skip-link") ?? false,
        );
        if (pinned)
          await cell.page.addStyleTag({
            content:
              ".skip-link:focus,.skip-link:focus-visible{background:var(--ember-btn) !important;color:var(--on-ember) !important}",
          });
        const r = await auditFlatControls(cell.page);
        const skip = r.stops.filter((s) => s.label.includes("Skip to content"));
        const skipProblems = r.problems.filter((p) => p.includes("Skip to content") && p.includes("fill changes"));
        const ok = focusedAtRender && skip.length > 0 && (pinned ? skipProblems.length > 0 : skipProblems.length === 0);
        console.log(
          `controls NC-2 skip link ${pinned ? "focus fill pinned to rest fill" : "unchanged"}: ${ok ? "PASS" : "FAIL"} ` +
            `focused at render ${focusedAtRender}, ${skip.length} skip-link stops, contrast to rest ` +
            `${skip.map((s) => `${s.contrastToRestPass.toFixed(2)}/${s.contrastAfterBlur.toFixed(2)}`).join(" ")}, ` +
            `${skipProblems.length} skip-link fill findings`,
        );
        if (!ok) failures.push(`controls NC-2 ${pinned ? "pinned" : "unchanged"}`);
      } finally {
        await cell.context.close();
      }
    }
  }
  if (run("flat") || run("strokes") || run("scroll") || run("overflow")) {
    let cells = 0;
    let stops = 0;
    let regions = 0;
    let focusedRegions = 0;
    let overflowCells = 0;
    let strokeCells = 0;
    let strokeElements = 0;
    const decoText = new Map<string, number>();
    for (const entry of inScopeEntries(inventory)) {
      for (const theme of THEMES) {
        for (const viewport of VIEWPORTS) {
          const cell = await renderCell(browser, target, entry, theme, viewport);
          if (cell === null) continue;
          try {
            const id = `${entry.id}/${theme}/${viewport}`;
            if (run("overflow")) {
              // RV-20/RV-21: the document is exactly as wide as the viewport (no horizontal page overflow).
              const w = await cell.page.evaluate(() => ({
                scroll: document.documentElement.scrollWidth,
                client: document.documentElement.clientWidth,
              }));
              overflowCells += 1;
              if (w.scroll !== viewport || w.client !== viewport)
                failures.push(`overflow ${id}: document ${w.scroll}px, client ${w.client}px, viewport ${viewport}px`);
            }
            if (run("flat")) {
              const r = await auditFlatControls(cell.page);
              cells += 1;
              stops += r.focusStops;
              for (const p of r.problems) failures.push(`flat ${id}: ${p}`);
            }
            if (run("strokes")) {
              // Whole-page Flat 2.0 scan: every element and ::before/::after, not just controls.
              const scan = await scanAllStrokes(cell.page);
              strokeCells += 1;
              strokeElements += scan.elements + scan.pseudos;
              for (const f of scan.findings) {
                if (f.kind === "deco-text") decoText.set(`${f.where} ${f.detail}`, (decoText.get(`${f.where} ${f.detail}`) ?? 0) + 1);
                else failures.push(`strokes ${id}: ${f.kind} ${f.where} ${f.detail}`);
              }
            }
            if (run("scroll")) {
              const s = await auditScrollRegions(cell.page);
              regions += s.overflowing;
              focusedRegions += s.focused;
              for (const p of s.problems) failures.push(`scroll ${id}: ${p}`);
            }
          } finally {
            await cell.context.close();
          }
        }
      }
    }
    console.log(`flat: ${cells} cells, ${stops} focus stops; scroll: ${regions} overflowing regions, ${focusedRegions} focused; overflow: ${overflowCells} cells; strokes: ${strokeCells} cells, ${strokeElements} elements+pseudos scanned`);
    if (decoText.size > 0) console.log(`text-decoration (informational, not counted): ${[...decoText.keys()].length} distinct, e.g. ${[...decoText.keys()].slice(0, 6).join(" | ")}`);
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`FAILURES ${failures.length}`);
const grouped = new Map<string, number>();
for (const f of failures) {
  const key = f.replace(/^(\w+) [^:]+\/(dark|light)\/\d+: /, "$1 ");
  grouped.set(key, (grouped.get(key) ?? 0) + 1);
}
for (const [k, n] of [...grouped].sort((a, b) => b[1] - a[1])) console.log(`${n}x ${k}`);
process.exitCode = failures.length === 0 ? 0 : 1;
