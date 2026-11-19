# Room background images

Owner: design-lead. Approved by operator decision
`batch2-approval-web-conferencing-features` (2026-11-18), item 1. Used by the
Background section of the room's "Audio and video" pane
([shape](../shapes/web-conferencing/background-effects.md), task 7.3, scenario WC-4).

| File | Card name | Accessible name | What it is |
|---|---|---|---|
| `ground.svg` | Ground | Image background: Ground | `bg` field with a soft `surface` lift and the Gathering motif (ember core, five dots, one cyan) at the right third |
| `dusk.svg` | Dusk | Image background: Dusk | ink to `ember-soft` sky with the brand orb setting low on the left |
| `tide.svg` | Tide | Image background: Tide | ink field with a cyan glow and three filled tide bands across the lower third |

Rules the sources follow: brand token values only (dark theme, because a video
background is theme-invariant), filled shapes and gradients only (no strokes), no text,
no photography, nothing in the centre of the frame where the person sits. The colours
are written as literals because an SVG image cannot read CSS custom properties; each
file lists the tokens it uses in a comment. A token change that affects these colours
means editing the SVG by hand (design-lead).

## Export spec (ui-engineer, task 7.3)

These SVGs are the sources. The app ships raster files, because the background
processor draws the image into a canvas and SVG decoding there is not dependable in
every browser (an SVG through `createImageBitmap` is not supported in Firefox).

| Output | Size | Format | Path (proposal, owner client-shell) |
|---|---|---|---|
| Background | 1280 x 720 | WebP, quality 90, sRGB, no alpha | `apps/web/public/backgrounds/<name>.webp` |
| Thumbnail | 320 x 180 | WebP, quality 85, sRGB, no alpha | `apps/web/public/backgrounds/<name>-thumb.webp` |

- Rasterize from these files at the exact sizes (for example
  `rsvg-convert -w 1280 ground.svg` then encode to WebP). Do not crop or scale
  non-uniformly: the viewBox is 16:9.
- Check for gradient banding after encoding (Dusk and Tide have long, dark gradients).
  If it bands, raise the quality; do not add noise or texture.
- Serve from the app's own origin: the shape requires every effect file to load from
  it, and WC-10 checks the network. client-shell owns the CSP.
- The thumbnail is decorative in the card (`alt=""`); the card label names it.
- Keep the `<name>` stems exactly `ground`, `dusk`, `tide`.

Not yet done: no raster export, no rendering inside the room. Design-lead rendered
each SVG at 640 x 360 for a visual check only.
