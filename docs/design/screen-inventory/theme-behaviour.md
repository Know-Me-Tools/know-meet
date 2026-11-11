# Theme behaviour (c02, task 2.3)

How the prototype chooses, applies and switches between dark and light. The
shells (React web, Tauri, Flutter) must reproduce this behaviour; values come from
`docs/design/tokens.json`. Sources: `prototype/assets/km.js` (theme module, lines
1–25 and 197–221, storage listener at 258), `prototype/assets/km.css`, page
`<style>` blocks.

## Selection

1. **Stored choice first.** `localStorage['km-meet-theme']`, value `'dark'` or
   `'light'`. Any other value, or storage that throws, is ignored.
2. **Otherwise the OS preference.** `prefers-color-scheme: light` gives light;
   everything else, including no preference, gives **dark**. Dark is the brand
   default.
3. The choice is written to `document.documentElement.dataset.theme` by an inline
   script in `<head>`, **before km.css paints**, so there is no flash of the wrong
   theme. Each HTML file also ships `data-theme="dark"` on `<html>` as the
   no-script fallback.

The OS preference is read once at load. The prototype does **not** follow a live
OS change while open; only an explicit toggle or another tab changes it.

## Application

- Dark values live on `:root`; light values on `[data-theme="light"]`, which only
  overrides (see `tokens.json`: light inherits every key it doesn't list).
- `color-scheme: dark` / `light` is set with the theme, so native form controls
  and scrollbars follow it.
- Light-only rules outside the token blocks: km.css `.switch .track` and
  `.switch .thumb` (now tokens `switch-track`, `switch-thumb`,
  `switch-thumb-shadow`), room.css `.drop` outline (`drop-outline`), and five
  index.html rules that swap a surface for `--card` or `--muted` (`.mini`,
  `.mtile .tag span`, `.cid`, `.concierge .glyph-wrap`, `.concierge .chip`).
  Those five are component decisions for the home page, not tokens; c10 must
  reproduce them.
- Light adds a card shadow (`shadow-card`) and a visible input ring
  (`ring-input`); dark has neither. Light uses darker ember for buttons and small
  text (`ember-btn`, `ember-text` `#C13E1E`) and keeps brand ember `#E04E28` for
  graphics only.

## Switching

- Control: `.theme-toggle`, an icon button in the app bar. In dark it shows a sun,
  is labelled "Switch to light theme" and titled "Light theme"; in light it shows a
  moon, "Switch to dark theme", "Dark theme". Labels and icons are re-synced after
  every render.
- Toggling writes `localStorage['km-meet-theme']` and updates `data-theme` at once.
- **Cross-tab sync:** a `storage` event for `km-meet-theme` applies the new theme
  in every other open tab.
- Transition: only `body` animates `background-color` and `color` over `--dur`
  (240ms, `ease`). Everything else switches instantly.
- Under `prefers-reduced-motion: reduce`, all transitions and animations drop to
  `0.001ms` and the orb animations stop.

## Requirements this puts on the shells

| Shell | Requirement |
|---|---|
| Web and Tauri (one bundle) | Same storage key and values, the same pre-paint inline script (CSP needs a hash or nonce for it), `data-theme` on `<html>`, the same toggle labels, cross-tab `storage` sync. Tauri's webview shares the behaviour; the custom titlebar must read the same tokens. |
| Flutter | `ThemeMode` from a persisted `'dark' \| 'light'` value (`shared_preferences`, plan c07), falling back to the platform brightness at launch, defaulting to dark; light and dark `ThemeData` generated from `tokens.json`. |
| Baseline capture (c03) | Set `km-meet-theme` in storage before navigation for each theme; never rely on the OS setting. Freeze the clock, because km.js builds meetings and recordings relative to now. |
