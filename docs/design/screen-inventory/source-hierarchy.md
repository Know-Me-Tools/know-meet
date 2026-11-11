# Design source hierarchy (c02, task 2.3)

When design sources disagree, the higher one wins. The order is fixed by the
phase plan (c02): `tokens.json`, then the brand guide, then the prototype, then
the live prototype. **One override applies to values:** under operator decision
Q-A2 (2026-11-09), where `tokens.json` disagreed with what the prototype renders,
the rendered value was written into `tokens.json`. After this change they agree,
so the order below holds for every future conflict.

| Rank | Source | Authoritative for | Not authoritative for |
|---|---|---|---|
| 1 | `docs/design/tokens.json` | Every colour, type, spacing, radius, layout and motion value, both themes; font families and weights | Layout, copy, behaviour |
| 2 | `docs/design/brand-guide.html` (with `brand.css`, `tokens.css`) | Logo, construction, clear space, minimum size, misuse, type rules, voice, motion intent, colour usage rules | Exact values (rank 1 wins; `tokens.css` is the brand documents' own stylesheet) |
| 3 | `docs/design/prototype/**` | Every screen, state, layout, component composition, copy and interaction in scope; theme behaviour (`km.js`) | Live media behaviour |
| 4 | `docs/design/live/**` | The in-call room layout with real media (`room.html`, `room.css`, `live.css`) as a reference for `meet.room` and `meet.room-guest` | Anything the prototype also defines |
| — | Root `live/` | **Nothing. Prohibited source** (plan c02; constraints "Path ownership"). Kept on disk only under the operator's temporary 500-line exception. | — |

Every source file's sha256, as read for this change, is in
[source-digests.json](source-digests.json) (39 files). `docs/design/live/**` was
untracked in git when read, so these content digests, not git object ids, identify
the inputs. The c03 baselines and the VS-1 evidence key must cite them.

## Discrepancies between sources and how they were resolved

Token-level discrepancies (31 custom properties, 107 literal values) are in
[../token-reconciliation/discrepancy-log.md](../token-reconciliation/discrepancy-log.md),
section A and B. Source-level ones:

| ID | Sources | Finding | Resolution (winner) |
|---|---|---|---|
| S-01 | tokens.json (1) vs tokens.css (2) | `tokens.css` lacks the new tokens and renders display text at 40–72px | tokens.json wins for product UI; tokens.css left as the brand documents' stylesheet (open decision D-4) |
| S-02 | brand guide (2) vs prototype (3) | Motion copy omits the speaking pulse (0.9s) and thinking breathe (1.2s) | Values from the rendering (rank 1 now holds them); guide copy is incomplete, not contradicted |
| S-03 | brand guide (2) vs computed contrast | Eight claimed ratios | All verified |
| S-04 | prototype (3) vs live (4) | `km.css` identical; `km.js` differs in two links; pages differ in link targets, live-only copy and a live settings panel; `room.css` is byte-identical to `meet.html`'s styles | Prototype wins for every static screen; live used only as the room-layout reference |
| S-05 | live (4) vs root `live/` | Six files differ | Root `live/` ignored |
| S-06 | prototype font loading vs CSS weights | Mono 400 and Inter 700 requested but not loaded | Rendering (nearest loaded weight) wins; fonts self-hosted at loaded weights only |
| S-07 | prototype page styles vs tokens | One-off decorative sizes | Component-local (open decision D-3) |
| S-08 | km.css comment vs shell plan | Google Fonts vs self-hosted | Self-hosted, same families and weights |
| S-09 | screens.html (3) vs pages (3) | screens.html lists 70 routes; pages also render a signed-out gate on dashboard, agents, recordings and settings, and the app frame has its own states | Inventory adds 4 gate states and 7 frame states (see `route-inventory.json`) |
