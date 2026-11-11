# c05 task 5.7: initial token and LiveKit-secret trace

- **Change / task:** `c05-scaffold-generation-import` 5.7, role build-platform. Initial trace only; the authoritative trace is c13 task 13.8 after c06, c07 and c12.
- **Scope:** imported BFF (`services/bff`), Tauri host (`apps/desktop/src-tauri`), Rust core and FRB crate (`crates/**`), React web and desktop baselines (`apps/web/**`), Flutter (`apps/mobile/lib`, `rust-builder`), UAR wiring (`command-manifest.json`, `/api/runtime`), PEM wiring (entity stores).
- **Method:** static reading plus greps; no code was run.

## Commands

```text
grep -rn -i -E 'livekit|secret|token|api[_-]?key|password|bearer|authoriz|jwt|env::var|var_os|process\.env|import\.meta\.env|cookie|credential' apps crates services (rs, ts, tsx, dart, mjs, Tauri JSON; frb_generated and cargokit excluded, then cargokit read separately)
git grep --untracked -nE 'LIVEKIT_API_(SECRET|KEY)\s*[:=]\s*["\x27]?[A-Za-z0-9]{16,}' -- . ':!*.md'      → no match (exit 1)
git grep --untracked -nE '(sk-[A-Za-z0-9]{20,}|api_key\s*=\s*["\x27][A-Za-z0-9]{12,})' -- apps packages services crates docs/design/live   → no match (exit 1)
```

## Findings

1. **No token or LiveKit path exists yet.** No imported surface mints, requests, stores or forwards a LiveKit token, API key or secret. The generated baselines are a local notes demo. There is nothing to leak today, and also nothing yet that enforces "clients only receive server-minted tokens". That path must be added server-side (BFF or `services/livekit`, livekit-platform) and re-traced at 13.8.
2. **Environment reads (none secret):**
   - BFF: `APP_DATA_DIR` (SQLite dir, default `.data`), `WEB_DIST_DIR` (static root, default `apps/web/dist`), `PORT` (default 3000).
   - Tauri host: `APP_DATA_DIR`; Windows-only `TAURI_WEBVIEW_BROWSER_ARGS`, `TAURI_WEBVIEW_DATA_DIRECTORY`.
   - Web test harness `apps/web/tests/restart.mjs`: passes the above plus `EXPECTED_CAPABILITY`.
   - React and Flutter code read no environment and embed no credentials.
3. **BFF has no identity or authorization.** `/api/notes` (GET/POST), `/api/capabilities` and `/api/runtime` are unauthenticated. It binds `127.0.0.1` only and `baseline-web.md` calls it "a local single-user baseline, not a hosted authenticated tenant service". **Blocker for any non-local deployment or token endpoint:** verified identity and tenant derivation must land in the BFF before a token-minting route is added. Static files go through `tower_http::services::ServeDir`, which rejects path traversal.
4. **UAR:** `/api/runtime` returns 503; Tauri `command-manifest.json` declares `uar_run/cancel/recover` with `uar:*` permissions, but `main.rs` registers only `list_notes`, `create_note`, `list_capabilities`. No agent execution or credential path exists.
5. **Tauri boundary:** capability `notes-window` grants `core:default` plus the three note commands to window `main` only; `forbiddenDefaults` includes `shell:default`. CSP: `default-src 'self'; connect-src 'self' ipc: http://ipc.localhost; …`. c06 must add the LiveKit `wss:` origin to `connect-src` (URL only, never a secret) and keep tokens out of the webview except the short-lived room token.
6. **PEM:** the entity stores call `/api/notes` (web) or Tauri `invoke` (desktop baseline) on same origin with no credentials; nothing sensitive is persisted client-side.
7. **Flutter/FRB:** calls go to the local Rust core through FRB (`crates/gen-ui-ffi`); no network client, no secrets.
8. **Build-time secret surface (cargokit, vendored):** `rust-builder/cargokit/build_tool/lib/src/precompile_binaries.dart` takes a private signing key and a GitHub token to publish precompiled binaries. It runs only through an explicit `precompile-binaries` command and no `cargokit_options.yaml` is present, so normal builds don't use it. If CI ever enables precompiled binaries, both values must come from CI secrets, never tracked files.

## Constraint status

- `no-livekit-secrets-in-repo`: PASS (grep, exit 1 = no match)
- `no-hardcoded-secrets`: PASS on `apps packages services crates docs/design/live` (`services` and `crates` added to the constraint's paths for this trace; delivery-lead may want them in `constraints.md`)
- `token-secret-stays-server-side`: vacuously true today (no token path); re-check at 13.8
