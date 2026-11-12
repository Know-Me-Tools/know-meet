// Foreground/background pairs the prototype actually renders (km.css, room.css,
// live.css). `bg` and `fg` are layer stacks, composited bottom-up, so a
// translucent "-soft" fill is measured over the surface it sits on.
// kind: text (4.5:1), large-text (3:1), ui and graphic (non-text, 3:1).

const text = (id, fg, bg, use, extra = {}) => ({ id, kind: "text", fg: [fg], bg, use, ...extra });
const ui = (id, fg, bg, use, extra = {}) => ({ id, kind: "ui", fg: [fg], bg, use, ...extra });

const SURFACES = ["bg", "bg-2", "surface", "card", "card-hov", "muted", "tile", "tile-2"];
// Surfaces a control may sit on (DESIGN.md "Flat 2.0 controls": never on card-hov, muted or tile).
const CONTROL_SURFACES = ["bg", "bg-2", "surface", "card"];

export const PAIRS = [
  ...SURFACES.map((s) => text(`fg-on-${s}`, "fg", [s], "Body and heading text")),
  ...["bg", "bg-2", "surface", "card", "card-hov", "muted", "tile"].map((s) =>
    text(`fg-sub-on-${s}`, "fg-sub", [s], "Secondary text, captions, mono labels, inactive tabs"),
  ),
  // D-6 control text: value, placeholder and label on every control fill state.
  text(
    "on-control-on-control",
    "on-control",
    ["control"],
    "Value text, unpressed segment and chip labels on the control fill",
  ),
  text(
    "on-control-on-control-hov",
    "on-control",
    ["control-hov"],
    "Value text on the hovered control fill",
  ),
  text(
    "placeholder-on-control",
    "control-placeholder",
    ["control"],
    "Placeholder text on the control fill",
    {
      note: "Placeholder and value are both near the light (dark theme) or dark (light theme) end, because a 3:1 fill boundary leaves no room for a dim placeholder. DESIGN.md: placeholders show an example prefixed 'e.g.' and never replace the visible label.",
    },
  ),
  text("on-focus-on-focus", "on-focus", ["focus"], "Value text and labels on the focus fill"),
  text(
    "focus-placeholder-on-focus",
    "focus-placeholder",
    ["focus"],
    "Placeholder text on a focused empty field",
  ),
  text(
    "on-control-invalid-on-control-invalid",
    "on-control-invalid",
    ["control-invalid"],
    "Value and placeholder text on the invalid fill",
  ),
  text(
    "on-selected-on-selected",
    "on-selected",
    ["selected"],
    "Current tab, current nav item, pressed segment, selected chip labels",
  ),
  text(
    "a2ui-primary-label",
    "on-ember",
    ["ember-btn"],
    "A2UI Button > Text label: inherits on-ember (decision log 16.4 axe failure was fg on ember)",
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
  // ---- D-6 (operator 2026-11-11): Flat 2.0 with no strokes. Control boundaries are
  // fills (>= 3:1 against every surface a control sits on), focus is a fill swap
  // (>= 3:1 against the unfocused fill AND the surface), selected is a fill.
  ...CONTROL_SURFACES.map((s) =>
    ui(
      `control-fill-vs-${s}`,
      "control",
      [s],
      `Control fill (input, select, textarea, unchecked box, radio, switch-off track, segmented track, slider track, toggle chip, drop zone) against ${s}`,
    ),
  ),
  ...CONTROL_SURFACES.map((s) =>
    ui(`invalid-fill-vs-${s}`, "control-invalid", [s], `Invalid text control fill against ${s}`),
  ),
  ...CONTROL_SURFACES.map((s) =>
    ui(
      `selected-fill-vs-${s}`,
      "selected",
      [s],
      `Selected fill (checked box/radio, pressed segment, current tab, current nav item, selected chip, slider range, drop zone over) against ${s}`,
    ),
  ),
  ...CONTROL_SURFACES.map((s) =>
    ui(
      `focus-fill-vs-${s}`,
      "focus",
      [s],
      `Focus fill against ${s} (ghost buttons, links, nav items, interactive cards, and every control)`,
    ),
  ),
  ...[
    ["control", "control fill"],
    ["control-invalid", "invalid fill"],
    ["selected", "selected/checked/pressed/current fill"],
    ["ember-btn", "primary button"],
    ["danger-btn", "danger button"],
    ["card", "secondary button (card fill)"],
    ["switch-track", "switch-off track"],
  ].map(([fill, what]) =>
    ui(
      `focus-fill-vs-unfocused-${fill}`,
      "focus",
      [fill],
      `Focus change: focus fill against the unfocused ${what} (>= 3:1, operator D-6)`,
    ),
  ),
  ui(
    "check-glyph-on-selected",
    "on-selected",
    ["selected"],
    "Checkbox tick and radio dot on the checked fill",
  ),
  ui(
    "check-glyph-on-focus",
    "on-focus",
    ["focus"],
    "Tick, radio dot, switch thumb, slider thumb and slider range while focused (the switch track and the slider plate take the focus fill)",
  ),
  // RV-22: a focused slider sits on a `focus` plate (the whole 44px control box);
  // the unfilled track keeps `control`, range and thumb take `on-focus`.
  ui(
    "slider-track-on-focus-plate",
    "control",
    ["focus"],
    "Focused slider: unfilled track against the focus plate",
  ),
  ui(
    "slider-thumb-focused-vs-track",
    "on-focus",
    ["control"],
    "Focused slider: thumb and range (on-focus) against the unfilled track",
  ),
  // RV-26: focus on a control or link that sits on a translucent "-soft" fill, measured
  // composited over the surface it renders on (chip-cyan in the room bar, notes in panels).
  ui(
    "focus-fill-vs-unfocused-cyan-soft-over-bg",
    "focus",
    ["bg", "cyan-soft"],
    "Focus change: Sources chip (chip-cyan) in the room bar",
  ),
  ...["amber", "red", "green", "cyan"].map((c) =>
    ui(
      `focus-fill-vs-${c}-soft-over-surface`,
      "focus",
      ["surface", `${c}-soft`],
      `Focus fill of a text link inside a ${c} note on a panel (surface)`,
    ),
  ),
  ui(
    "switch-thumb-vs-track-off",
    "switch-thumb",
    ["switch-track"],
    "Switch off: thumb against track",
  ),
  ...CONTROL_SURFACES.map((s) =>
    ui(`switch-track-on-vs-${s}`, "ember-btn", [s], `Switch on: ember track against ${s}`),
  ),
  ui(
    "switch-thumb-on-vs-track-on",
    "switch-thumb-on",
    ["ember-btn"],
    "Switch on: thumb against ember track",
  ),
  ...["control", "selected", ...CONTROL_SURFACES].map((s) =>
    ui(`slider-thumb-vs-${s}`, "slider-thumb", [s], `Slider thumb against ${s}`),
  ),
  ui(
    "primary-btn-fill-vs-bg",
    "ember-btn",
    ["bg"],
    "Primary button fill against the page (label also identifies it)",
  ),
  ...["green", "amber", "red"].map((c) =>
    ui(
      `pip-${c}-on-${c}-soft-over-card`,
      `pip-${c}`,
      ["card", `${c}-soft`],
      `Status pip in chip-${c} (D-6: pip role)`,
    ),
  ),
  ...["green", "amber", "red"].map((c) =>
    ui(
      `pip-${c}-on-${c}-soft-over-surface`,
      `pip-${c}`,
      ["surface", `${c}-soft`],
      `Status pip in chip-${c} on a surface`,
    ),
  ),
  // Speaking state: a solid badge in the tile head replaces the 3px inset ring.
  ...["speak-person", "speak-agent", "speak-phone"].flatMap((b) => [
    ui(`${b}-badge-vs-tile`, b, ["tile"], `Speaking badge (${b}) on a room tile`),
    ui(
      `${b}-badge-vs-white-frame`,
      b,
      ["#FFFFFF"],
      `Speaking badge (${b}) over a white video frame`,
    ),
    ui(
      `${b}-badge-vs-black-frame`,
      b,
      ["#000000"],
      `Speaking badge (${b}) over a black video frame`,
    ),
    ui(`on-speak-bars-on-${b}`, "on-speak", [b], `Voice bars inside the ${b} badge`),
  ]),
  ui(
    "media-quality-poor-on-media-tag-bg-over-white-frame",
    "media-quality-poor",
    ["#FFFFFF", "media-tag-bg"],
    "Poor-connection bars on a video tile tag (live.css)",
  ),
  // ---- Surface hierarchy (operator 2026-11-12, tokens v1.5.0): with no strokes and no
  // shadows, the page, panel and raised levels are told apart by fill alone. Each adjacent
  // step must be 1.15-1.25:1 in both themes (DESIGN.md "Surface hierarchy").
  {
    id: "surface-step-surface-vs-bg",
    kind: "surface-step",
    fg: ["surface"],
    bg: ["bg"],
    max: 1.25,
    use: "Panel level (.card, .panel, .stat, .empty, even table rows) against the page",
  },
  {
    id: "surface-step-card-vs-surface",
    kind: "surface-step",
    fg: ["card"],
    bg: ["surface"],
    max: 1.25,
    use: "Raised level (.card-raised, secondary button) against the panel",
  },
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
