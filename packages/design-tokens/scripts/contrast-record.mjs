#!/usr/bin/env node
import { createHash } from "node:crypto";
// Computes the WCAG 2.2 contrast record for docs/design/tokens.json.
// Usage: node packages/design-tokens/scripts/contrast-record.mjs [repo-root]
// Writes docs/design/token-reconciliation/contrast-record.json. Ratios use the
// WCAG 2.x relative-luminance formula; translucent colours are alpha-composited
// over the surface they sit on in the prototype before the ratio is taken.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PAIRS } from "./contrast-pairs.mjs";

const root = resolve(process.argv[2] ?? join(import.meta.dirname, "..", "..", ".."));
const tokensPath = join(root, "docs/design/tokens.json");
const outPath = join(root, "docs/design/token-reconciliation/contrast-record.json");
const raw = readFileSync(tokensPath);
const tokens = JSON.parse(raw.toString("utf8"));

function themeValues(theme) {
  const base = tokens.themes.dark;
  return theme === "dark" ? { ...base } : { ...base, ...tokens.themes.light };
}

function parseColour(value) {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v);
  if (rgba)
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  throw new Error(`Not a colour: ${value}`);
}

function over(top, bottom) {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const toHex = ({ r, g, b }) =>
  "#" +
  [r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// A layer is a token name or a literal colour; layers composite bottom-up.
function resolveLayers(layers, values) {
  let colour = null;
  for (const layer of layers) {
    const value = layer.startsWith("#") || layer.startsWith("rgb") ? layer : values[layer];
    if (value === undefined) throw new Error(`Unknown token: ${layer}`);
    const c = parseColour(value);
    colour = colour === null ? { ...c, a: 1 } : over(c, colour);
  }
  return colour;
}

const thresholds = { text: 4.5, "large-text": 3, ui: 3, graphic: 3 };
const rows = [];
for (const pair of PAIRS) {
  for (const theme of pair.themes ?? ["dark", "light"]) {
    const values = themeValues(theme);
    const bg = resolveLayers(pair.bg, values);
    let fg = resolveLayers([...pair.bg, ...pair.fg], values);
    if (pair.fgOpacity !== undefined) fg = over({ ...fg, a: pair.fgOpacity }, bg);
    const r = Math.floor(ratio(fg, bg) * 100) / 100;
    const need = thresholds[pair.kind];
    rows.push({
      id: `${theme}.${pair.id}`,
      theme,
      kind: pair.kind,
      use: pair.use,
      sc: pair.kind.endsWith("text") ? "1.4.3" : "1.4.11",
      fg: pair.fg.join(" over "),
      bg: pair.bg.join(" over "),
      fgHex: toHex(fg),
      bgHex: toHex(bg),
      ratio: r,
      required: need,
      result: r >= need ? "PASS" : "FAIL",
      note: pair.note ?? null,
    });
  }
}

const record = {
  generatedBy: "packages/design-tokens/scripts/contrast-record.mjs",
  standard:
    "WCAG 2.2 AA (SC 1.4.3 text 4.5:1, large text 3:1; SC 1.4.11 non-text 3:1). Ratios truncated, not rounded, to 2 decimals.",
  tokens: {
    path: "docs/design/tokens.json",
    sha256: createHash("sha256").update(raw).digest("hex"),
    version: tokens.version,
  },
  summary: {
    pairs: rows.length,
    pass: rows.filter((r) => r.result === "PASS").length,
    fail: rows.filter((r) => r.result === "FAIL").length,
  },
  rows,
};
writeFileSync(
  outPath,
  JSON.stringify(record, null, 0).replace(/\},\{/g, "},\n{").replace('"rows":[', '"rows":[\n') +
    "\n",
);
process.stdout.write(
  `${record.summary.pairs} pairs, ${record.summary.fail} failing -> ${outPath}\n`,
);
