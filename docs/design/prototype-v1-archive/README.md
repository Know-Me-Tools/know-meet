# Prototype v1 archive (frozen)

Byte-for-byte copy of the Know Meet prototype as it was before reference
revision v2 (operator approval 2026-11-11, "Yes, go ahead"). Copied from git
`9ef34aa10fb949c8389febbb04a92934322a3172`, branch
`feat/round-5-ui-kit-flutter-commands`.

- `*.html`, `assets/`: `docs/design/prototype/` v1 (the reference the c03
  baselines with set digest `a3380e5f…b552` were captured from).
- `live/assets/`: the three `docs/design/live/assets/` files that v2 also
  changed (`km.css`, `km.js`, `room.css`). The rest of `docs/design/live/` was
  not changed and is not copied.

Every digest is in [`sha256-manifest.txt`](sha256-manifest.txt)
(`shasum -a 256 -c sha256-manifest.txt` from this folder). The digests match the
c02 read in `docs/design/screen-inventory/source-digests.json`.

Rules: history only. Never edit, never read for values (the current reference
is `docs/design/prototype/`, tokens v1.3.0), never capture baselines from it.
What changed and why: `docs/design/token-reconciliation/discrepancy-log.md`,
section F. The folder is a frozen prototype exemption for the line-length and
naming rules (request to the repo-rules owner in section F).
