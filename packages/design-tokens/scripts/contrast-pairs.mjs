// Foreground/background pairs the prototype actually renders (km.css, room.css,
// live.css). `bg` and `fg` are layer stacks, composited bottom-up, so a
// translucent "-soft" fill is measured over the surface it sits on.
// kind: text (4.5:1), large-text (3:1), ui and graphic (non-text, 3:1).

const text = (id, fg, bg, use, extra = {}) => ({ id, kind: "text", fg: [fg], bg, use, ...extra });
const ui = (id, fg, bg, use, extra = {}) => ({ id, kind: "ui", fg: [fg], bg, use, ...extra });

const SURFACES = ["bg", "bg-2", "surface", "card", "card-hov", "muted", "tile", "tile-2"];

export const PAIRS = [
  ...SURFACES.map((s) => text(`fg-on-${s}`, "fg", [s], "Body and heading text")),
  ...["bg", "bg-2", "surface", "card", "card-hov", "muted", "tile"].map((s) =>
    text(`fg-sub-on-${s}`, "fg-sub", [s], "Secondary text, captions, mono labels, inactive tabs"),
  ),
  text(
    "placeholder-on-card",
    "fg-sub",
    ["card"],
    "Input placeholder (.input::placeholder opacity 0.85)",
    {
      fgOpacity: 0.85,
      note: "Placeholder text is exempt from 1.4.3 only when it is not the sole label; prototype fields all have visible labels.",
    },
  ),
  ...["bg", "surface", "card", "card-hov"].map((s) =>
    text(`ember-text-on-${s}`, "ember-text", [s], "Links, eyebrows, small ember text"),
  ),
  text(
    "ember-text-on-ember-soft",
    "ember-text",
    ["ember-soft"],
    "chip-ember, current wizard step, gate icon",
  ),
  ...["bg", "surface", "card"].map((s) =>
    text(`cyan-text-on-${s}`, "cyan-text", [s], "Agent and dot labels"),
  ),
  ...["surface", "card"].map((s) =>
    text(
      `cyan-text-on-cyan-soft-over-${s}`,
      "cyan-text",
      [s, "cyan-soft"],
      "chip-cyan, agent glyph, avatar-cyan",
    ),
  ),
  text(
    "cyan-text-on-tile-on-cyan-soft-over-tile",
    "cyan-text-on-tile",
    ["tile", "cyan-soft"],
    "Agent glyph on a room tile (D-5: cyan-text-on-tile role)",
  ),
  ...["surface", "card"].map((s) =>
    text(
      `green-text-on-green-soft-over-${s}`,
      "green-text",
      [s, "green-soft"],
      "Completed wizard step number",
    ),
  ),
  ...["surface", "card"].map((s) => text(`green-text-on-${s}`, "green-text", [s], "Success text")),
  ...["surface", "card"].map((s) => text(`amber-text-on-${s}`, "amber-text", [s], "Warning text")),
  ...["surface", "card"].map((s) =>
    text(`red-text-on-${s}`, "red-text", [s], "Error text, field errors"),
  ),
  ...["green", "amber", "red"].flatMap((c) =>
    ["surface", "card"].map((s) =>
      text(`fg-on-${c}-soft-over-${s}`, "fg", [s, `${c}-soft`], `chip-${c} label`),
    ),
  ),
  text("on-ember-on-ember-btn", "on-ember", ["ember-btn"], "Primary button label, skip link"),
  text("on-ember-on-ember-btn-hov", "on-ember", ["ember-btn-hov"], "Primary button label, hover"),
  text(
    "on-danger-on-danger-btn",
    "on-danger",
    ["danger-btn"],
    "Danger button and Leave control label",
  ),
  text(
    "on-danger-on-danger-btn-hov",
    "on-danger",
    ["danger-btn-hov"],
    "Danger button label, hover",
  ),
  text("bg-on-fg", "bg", ["fg"], "Toast (inverted)"),
  text("fg-on-ember-soft", "fg", ["ember-soft"], "Drop zone over state, ember-tinted panels"),
  ...[
    ["white-frame", "#FFFFFF"],
    ["black-frame", "#000000"],
  ].flatMap(([frame, colour]) => [
    text(
      `on-media-on-media-tag-bg-over-${frame}`,
      "on-media",
      [colour, "media-tag-bg"],
      "Name tag on live video tile (live.css)",
      {
        note: "Video content behind the tag is unknown; white and black frames bound the range.",
      },
    ),
    text(
      `media-tag-host-on-media-tag-bg-over-${frame}`,
      "media-tag-host",
      [colour, "media-tag-bg"],
      "Host name tag on live video tile (live.css)",
    ),
    text(
      `on-media-on-media-foot-scrim-over-${frame}`,
      "on-media",
      [colour, "media-foot-scrim"],
      "Video tile footer text over gradient (room.css, darkest stop)",
      {
        note: "Measured at the gradient's darkest stop; the top of the footer fades to transparent.",
      },
    ),
  ]),
  ...["bg", "bg-2", "surface", "card"].map((s) =>
    ui(`focus-ring-on-${s}`, "ember", [s], ":focus-visible 2px ember outline, offset 2px"),
  ),
  ui("input-focus-ring-on-card", "ember", ["card"], ".input:focus-visible inset 2px ember"),
  ui("input-invalid-ring-on-card", "red", ["card"], ".input[aria-invalid] inset 2px red"),
  // D-5: the input boundary is a 1px inset ring in both themes (input-only exception to Flat 2.0).
  ...["card", "bg", "surface"].map((s) =>
    ui(
      `input-ring-vs-${s}`,
      "ring-input",
      [s],
      `1px inset input ring against ${s === "card" ? "the input fill" : `the ${s} around it`}`,
    ),
  ),
  ...["surface", "card"].map((s) =>
    ui(
      `switch-track-off-vs-${s}`,
      "switch-track",
      [s],
      "Switch off: track against the row surface",
    ),
  ),
  ui(
    "switch-thumb-vs-track-off",
    "switch-thumb",
    ["switch-track"],
    "Switch off: thumb against track",
  ),
  ...["surface", "card"].map((s) =>
    ui(
      `switch-track-on-vs-${s}`,
      "ember-btn",
      [s],
      "Switch on: ember track against the row surface",
    ),
  ),
  ui(
    "switch-thumb-on-vs-track-on",
    "switch-thumb-on",
    ["ember-btn"],
    "Switch on: white thumb against ember track",
  ),
  ui(
    "seg-pressed-vs-seg",
    "card",
    ["muted"],
    "Segmented control: pressed segment against the track",
  ),
  ui("tab-indicator-vs-bg", "ember", ["bg"], "Selected tab 2px ember underline"),
  ...["green", "amber", "red"].map((c) =>
    ui(`${c}-pip-on-${c}-soft-over-card`, c, ["card", `${c}-soft`], `Status pip in chip-${c}`),
  ),
  ui("cyan-ring-vs-tile", "cyan", ["tile"], "Agent/dot activity 3px inset ring on a room tile"),
  ui("ember-ring-vs-tile", "ember", ["tile"], "Active speaker 3px inset ring on a room tile"),
  ui("green-ring-vs-tile", "green", ["tile"], "Speaking (person) 3px inset ring on a room tile"),
  ui(
    "drop-outline-vs-surface",
    "drop-outline",
    ["surface"],
    "Knowledge drop zone 2px dashed outline",
  ),
  ui(
    "primary-btn-fill-vs-bg",
    "ember-btn",
    ["bg"],
    "Primary button fill against the page (label also identifies it)",
  ),
  ui(
    "media-quality-poor-on-media-tag-bg-over-white-frame",
    "media-quality-poor",
    ["#FFFFFF", "media-tag-bg"],
    "Poor-connection bars on a video tile tag (live.css)",
  ),
  {
    id: "brand-ember-on-bg",
    kind: "graphic",
    fg: ["ember"],
    bg: ["bg"],
    use: "Brand ember: the symbol core, orb and large shapes",
  },
  {
    id: "brand-ember-on-card",
    kind: "graphic",
    fg: ["ember"],
    bg: ["card"],
    use: "Brand ember on cards (orb, mark)",
  },
  {
    id: "brand-cyan-on-bg",
    kind: "graphic",
    fg: ["cyan"],
    bg: ["bg"],
    use: "Agent dot, orb--cyan",
  },
];
