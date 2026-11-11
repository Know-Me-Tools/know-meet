# Gate 16.5 (O side): Streamdown hardening in prototype O

Change: `c16-agentic-core-gates`, task 16.5, O side only. The apps/web CSP fix (`img-src`/`media-src`
for allowed media origins) is the other half of 16.5. It is outside `spikes/agentic-ui/own/` and is not
part of this record. Date: 2026-11-10. Author: architect.

**Status: O side done.**

- Links and images now have explicit origin and scheme allowlists, and there is no allow-all default.
- The raw-HTML parser path is gone from the bundle.
- KaTeX fonts are self-hosted, so no `data:` font is loaded.
- The hostile suite passes 88/88: 44/44 in Chromium and 44/44 in WebKit.

## 1. What Streamdown allows by default (answering the reviewer's challenge)

Measured, not assumed. `test/markdown-policy.test.ts` imports Streamdown 2.7.1's exported
`defaultRehypePlugins` and runs the real rehype-harden 1.1.9 function over a fixed URL matrix. Raw output:
`raw/streamdown-policy-matrix.json`.

- **Default rehype chain:** `raw → sanitize → harden`. `rehype-raw` parses raw HTML in model output into
  elements, then `rehype-sanitize` cleans them.
- **Default harden options:**

  ```json
  { "allowedImagePrefixes": ["*"], "allowedLinkPrefixes": ["*"], "allowedProtocols": ["*"],
    "defaultOrigin": undefined, "allowDataImages": true }
  ```

  So the default **is allow-all**:
  - any http(s) link renders as an anchor, whatever the origin;
  - any http(s) image loads, whatever the origin;
  - `data:image/*` images, SVG included, are allowed;
  - every protocol passes the protocol check.
- **What the default still blocks:** rehype-harden never lets `javascript:`, `data:` (on links),
  `vbscript:` or `file:` through.
- **A finding beyond the challenge:** whatever the options, rehype-harden always passes `mailto:`,
  `irc:`, `ircs:`, `xmpp:` and `blob:` URLs, because they are its built-in "safe protocols". Prefix
  allowlists alone cannot block them. O therefore keeps a second check in its own `a` and `img`
  renderers.

### Default vs O, enumerated (`raw/streamdown-policy-matrix.json`)

| URL | Streamdown default | O after harden | O rendered |
|---|---|---|---|
| link `https://know-me.tools/docs/spec-42` | anchor | anchor | **anchor** |
| link `https://evil.example/phish` | anchor | text | text |
| link `http://know-me.tools/docs` (http, origin not listed) | anchor | text | text |
| link `mailto:team@know-me.tools` | anchor | anchor | **anchor** (mailto enabled) |
| link `irc://…`, `xmpp:…`, `blob:…` | anchor | anchor | text (renderer check) |
| link `javascript:`, `data:text/html`, `vbscript:`, `file:` | text | text | text |
| link `/relative/path` | anchor | text | text |
| link `#section` | anchor | anchor | text (renderer check: resolves to `tauri:`/app origin) |
| image `http://127.0.0.1:4317/media/whiteboard.png` (allowed origin) | loads | loads | **loads** |
| image `http://127.0.0.1:4318/…` (evil), `https://evil.example/…` | loads | blocked | blocked |
| image `data:image/png`, `data:image/svg+xml` | loads | blocked | blocked |
| image `blob:…` | loads | loads | blocked (renderer check) |
| image `javascript:`, `/local.png` | blocked / loads | blocked | blocked |

## 2. What changed in O

| File | Change |
|---|---|
| `src/domain/media-policy.ts` | `LinkPolicy` and `checkLinkUrl`: anchors only for listed origins, or `mailto:` when enabled. Everything else renders as text. `checkMediaUrl` is unchanged (listed origins over http(s) only). The old scheme-only `isSafeLink` is removed. |
| `src/presentation/markdown-policy.ts` (new, pure) | `MarkdownPolicy` and `buildHardenOptions`: origin-scoped prefixes (`https://host/`), never `*`; `allowedProtocols: []`; `allowDataImages: false`. |
| `src/presentation/markdown.tsx` | Rehype chain `sanitize → harden(buildHardenOptions(policy))`, with no raw step. The `a` and `img` renderers re-check with the domain policy; a blocked image renders `[data-testid=km-media-blocked]`. |
| `src/infrastructure/launch-params.ts` | `allowLinkOrigins` comes from the repeatable `allowLinkOrigin` parameter (an O-only extension of the contract), else the configured `DEFAULT_LINK_ORIGINS = ["https://know-me.tools"]`. There is no allow-all fallback. |
| `src/main.tsx`, `session-context.tsx`, `message-view.tsx` | Wire one `MarkdownPolicy`: base origin = the app origin, links = configured origins plus mailto, media = `allowMediaOrigin`. |
| `src/infrastructure/rehype-raw-disabled.ts` (new) + `vite.config.ts` | Vite aliases `rehype-raw` to a stub that drops `raw` nodes. Streamdown imports rehype-raw statically for its default chain, so this is the only way to keep its parser (hast-util-raw → parse5) out of the bundle. |
| `vite.config.ts` | `assetsInlineLimit` never inlines font files, so KaTeX's small `KaTeX_Size4-Regular.woff2` is emitted as a file instead of a `data:font/woff2` URL. |
| `test/markdown-policy.test.ts` (new) | Tests the default and the configured policy (section 1), plus a test that an empty policy allows no http(s) link or image. |

For the product, the link allowlist must come from configuration, not from code. In the spike it is
`DEFAULT_LINK_ORIGINS` or the launch parameter.

## 3. Evidence

### Bundle audit (`gates/scripts/dist-audit.ts`)

| | Before (`raw/dist-audit-before.json`) | After (`raw/dist-audit-after.json`) |
|---|---|---|
| `url(data:font/…)` in CSS | 1 (`index-DI2BWDTu.css`) | **0** |
| Font files emitted | 65 | 66 (+ `KaTeX_Size4-Regular-*.woff2`) |
| parse5 / hast-util-raw markers in JS | 10 + 2 (`index-B5KV0FZv.js`) | **0** |
| Entry chunk raw | 1,807,155 B | 1,634,657 B (−172,498 B) |
| Entry chunk brotli (q11) | 436,977 B | 400,169 B (−36,808 B) |

### KaTeX font under the real CSP (Tauri WKWebView, `font-src 'self'`)

The shell's CSP is apps/web's policy (`font-src 'self'`).

- **Before:** the 2026-11-10 c15 Tauri conformance run of O (`../../measurements/raw/tauri-own-conformance-mwawviik.jsonl`)
  recorded **143** `font-src` violations for a `data:` font, one per page load.
- **After:** the 16.1 runs of the rebuilt shell (`raw/16-1/tauri-own-gate-*-conformance-*.jsonl`)
  record **0** `font-src` violations. For example, the focused run had 85 result records and no
  `font-src` entry. Section 4 lists what the CSP still reports.

### Hostile suite, Chromium and WebKit

```
SPIKE_URL=http://localhost:4173/ SPIKE_NAME=own-gate165 SPIKE_BROWSERS=chromium,webkit pnpm check --grep @hostile
88 passed (2.1m)   expected 88, unexpected 0, flaky 0, skipped 0
```

- Per test: `raw/hostile-check-summary.json`. Log: `raw/hostile-check.log`.
- Playwright report: `../../harness/reports/checks-own-gate165.json` and `-html/`.
- This includes the two link controls: `link-https-allowed` and `stream-split-link-emphasis` still
  render their `https://know-me.tools/...` anchors under the explicit allowlist. It also includes
  `media-md-image-disallowed` and the KaTeX items.

### Unit tests

The 27 tests pass (`raw/unit-tests.txt`): 4 policy tests, 15 scheduler and session tests for 16.1, and
8 pre-existing tests.

## 4. Observations and what is not covered

- **The apps/web CSP blocks allowed media.** It still blocks the allowed harness media origin
  (`img-src`/`media-src`). The 16.1 runs record those violations in `custom-chunks`. Fixing it is the
  other half of 16.5 and belongs to the apps/web owner. As before, O itself loads only allowed origins.
- **A `script-src 'eval'` violation on every page load** comes from zod v4 core's `allowsEval` probe
  (`try { Function("") } catch {}`). That probe sits in the zod copy used by the AG-UI/A2UI packages.
  It fails closed and changes nothing, but it produces CSP noise. If the product wants a clean CSP
  report, use zod's `jitless` config.
- **Behaviour changes users would notice:**
  - Links to unlisted origins render as plain text. That includes fragment-only (`#x`) and relative
    links in model output.
  - `blob:` images in markdown are blocked. Media should arrive as `km.media` from listed origins.
- **WebView2:** the hostile suite was not run in WebView2. See `../webview2-runbook.md` (16.1). The
  CI workflow there runs the scheduler gate only.

## 5. Commands (from `spikes/agentic-ui/own/`)

```bash
node gates/scripts/dist-audit.ts before-16-5 > gates/raw/dist-audit-before.json   # before any change
KM_WRITE_EVIDENCE=1 node --test --test-reporter=spec test/*.test.ts > gates/raw/unit-tests.txt
pnpm typecheck && pnpm build
node gates/scripts/dist-audit.ts after-16-5 > gates/raw/dist-audit-after.json
pnpm preview &                                   # vite preview, http://localhost:4173/ (stopped afterwards)
(cd ../harness && SPIKE_URL=http://localhost:4173/ SPIKE_NAME=own-gate165 SPIKE_BROWSERS=chromium,webkit \
  pnpm check --grep @hostile)                    # harness already serving on 127.0.0.1:4317
```

Environment: macOS 26.7.3 (25G416), Apple M1 Max; Node 24.11.1; pnpm 11.15.0. Playwright 1.65.0 with
Chromium 158 headless shell and WebKit 27.2. Streamdown 2.7.1, rehype-harden 1.1.9, KaTeX 0.16.47,
Vite 8.3.7. The Tauri shell is described in `16-1-scheduler.md`.
