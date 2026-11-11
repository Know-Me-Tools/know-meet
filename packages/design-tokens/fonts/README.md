# Self-hosted fonts (c02, task 2.2)

The three Know Meet families, self-hosted so the shells can set CSP
`font-src 'self'`. Only the weights the prototype loads are shipped: every page in
`docs/design/prototype/` and `docs/design/live/` requests
`Space Grotesk 500;600;700`, `Inter 400;500;600` and `JetBrains Mono 500;600`
from Google Fonts (see `docs/design/tokens.json` → `fonts`). All three families are
licensed under the SIL Open Font License 1.1; each licence file sits next to its
fonts. Files were taken unmodified from the official upstream GitHub releases
(downloaded 2026-11-09 with `gh release download`) and renamed to kebab-case only.

## Files

| File                            | Family / weight                                           | Upstream file in release archive                    | sha256                                                             |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| `space-grotesk-variable.woff2`  | Space Grotesk, `wght` axis 300–700 (serves 500, 600, 700) | `SpaceGrotesk-2.0.0/woff2/SpaceGrotesk[wght].woff2` | `8e085aa438094f11487a836652edd5c054fa6a96f63fc7c282105ee3a4b08c07` |
| `inter-regular.woff2`           | Inter 400                                                 | `web/Inter-Regular.woff2`                           | `e06f6b1bc553aaea4e4668023ed0ab0a147129c3107f511bc7d03d361b0ae085` |
| `inter-medium.woff2`            | Inter 500                                                 | `web/Inter-Medium.woff2`                            | `0ff3e94614e1493eb556314fd247ae6c4a85a7783b4cc86be539940cf83f2a48` |
| `inter-semibold.woff2`          | Inter 600                                                 | `web/Inter-SemiBold.woff2`                          | `5cb7103e4e605989afebc03d989c79201e54b21b5183db33981f70db9178a301` |
| `jetbrains-mono-medium.woff2`   | JetBrains Mono 500                                        | `fonts/webfonts/JetBrainsMono-Medium.woff2`         | `086c48dfbea9ddaff1320f7e09399b8e2924e88ce67453721255db3bdbb5a353` |
| `jetbrains-mono-semibold.woff2` | JetBrains Mono 600                                        | `fonts/webfonts/JetBrainsMono-SemiBold.woff2`       | `918edad542a1da608fd2ba8daebaff9ac802309103fe760eed465b8b4e47faf1` |
| `space-grotesk-ofl.txt`         | Licence, Space Grotesk                                    | `SpaceGrotesk-2.0.0/OFL.txt`                        | `564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72` |
| `inter-ofl.txt`                 | Licence, Inter                                            | `LICENSE.txt`                                       | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| `jetbrains-mono-ofl.txt`        | Licence, JetBrains Mono                                   | `OFL.txt`                                           | `30f0c136e3c88e422d0791acd97238870f9054a9729bc34cf2ff0d4ed8cac4ad` |

## Sources

| Family                         | Release                                                | Archive URL                                                                                    | Archive sha256                                                     |
| ------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Space Grotesk 2.0.0            | floriankarsten/space-grotesk, tag `2.0.0` (2020-10-29) | https://github.com/floriankarsten/space-grotesk/releases/download/2.0.0/SpaceGrotesk-2.0.0.zip | `53b415577d4139248555300710bea0d268c7a5be67b93de53b716a9736cabffd` |
| Inter 4.1 (font version 4.001) | rsms/inter, tag `v4.1` (2024-11-16)                    | https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip                             | `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e` |
| JetBrains Mono 2.304           | JetBrains/JetBrainsMono, tag `v2.304` (2023-01-14)     | https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip    | `6f6376c6ed2960ea8a963cd7387ec9d76e3f629125bc33d1fdcd7eb7012f7bbf` |

## Notes for the token generator (c04) and shells (c06, c07)

- **Space Grotesk is variable.** Release 2.0.0 ships static files only for 300,
  400, 500 and 700; there is no static SemiBold. Google Fonts serves 600 as an
  instance of the same variable font, so the variable file is the faithful match.
  Declare it once: `font-weight: 500 700` (or `300 700`), `font-display: swap`.
  It was not subset or instanced, because that would create a modified font
  version under the OFL.
- **Inter and JetBrains Mono are static.** One `@font-face` per file.
- **Don't add weights.** The prototype requests Mono 400 in a few places and
  Inter 700 for `b`/`strong`; browsers fall back to the nearest loaded face (Mono
  500, Inter 600). Adding those faces would change the rendering. See
  `docs/design/token-reconciliation/discrepancy-log.md`, S-06.
- **Flutter:** use the same files. Flutter needs TTF/OTF rather than WOFF2, so c07
  should take the TTFs from the same release archives (same versions) and record
  their sha256s; that is a mobile-engineer task, not done here.
- **Version drift risk:** Google Fonts may serve slightly different builds from
  these releases. VS-1 baselines are captured from the prototype with Google
  Fonts; any glyph-level difference shows up there and is adjudicated by
  design-lead under the c03 exception rubric.
