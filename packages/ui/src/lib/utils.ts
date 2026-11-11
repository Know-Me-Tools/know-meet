// TJ-ARCH-MOB-001 compliant
// Class-name merge for the kit. The generated Tailwind theme
// (@know-meet/design-tokens/theme.css) names scales the default merge tables
// don't know: without this, `text-15` reads as a text *colour* and silently
// drops `text-foreground` from the same call. Keep these lists in step with the
// token scales in theme.css when design-lead adds a step.
import { createCn } from "cn/config";

const TEXT_SIZES = [
  "10",
  "11",
  "13",
  "15",
  "22",
  "34",
  "display",
  "display-brand",
  "stat",
  "glyph",
  "tile-avatar",
  "code-inline",
];
const RADII = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "9",
  "10",
  "base",
  "14",
  "tile",
  "18",
  "22",
  "28",
  "pill",
  "round",
];
const SPACING = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "header-h",
  "rs-w",
  // D-7 size tokens (theme.css `--spacing-size-*`).
  "size-target-min",
  "size-target",
  "size-control-h",
  "size-control-h-sm",
  "size-input-pad-x",
  "size-input-pad-y",
  "size-select-pad-end",
  "size-textarea-min-h",
  "size-check",
  "size-switch-w",
  "size-switch-h",
  "size-switch-thumb",
  "size-switch-thumb-inset",
  "size-switch-travel",
  "size-slider-track-h",
  "size-slider-thumb",
  "size-pip",
  "size-speak-badge",
  "size-dialog-w",
  "size-sheet-w",
  "size-toast-w",
  "size-tooltip-max-w",
  "size-tooltip-pad-x",
  "size-tooltip-pad-y",
  "size-nav-bar-h",
  "size-nav-rail-w",
  "size-nav-indicator-w",
  "size-nav-indicator-h",
];
const LEADING = [
  "display",
  "105",
  "stat",
  "heading",
  "140",
  "145",
  "body",
  "bubble",
  "code",
  "18px",
  "20px",
];
const TRACKING = ["display", "heading", "code", "label", "table", "eyebrow", "masked"];

export const cn = createCn({
  extend: {
    theme: {
      text: TEXT_SIZES,
      radius: RADII,
      spacing: SPACING,
      leading: LEADING,
      tracking: TRACKING,
      font: ["display", "body", "mono"],
      "font-weight": ["regular"],
    },
  },
});
