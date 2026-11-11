# @know-meet/desktop

The Tauri 2 host for Know Meet. It has no frontend of its own: it embeds the
`apps/web` production build (`frontendDist: ../../web/dist`), so web and desktop
ship one React bundle (OpenSpec `c06-web-desktop-single-bundle`, scenario VS-2).

```text
apps/desktop/
  package.json            @know-meet/desktop: Tauri CLI only
  scripts/tauri-cli.ts    runs the CLI with the shared CSP (see below)
  src-tauri/              Rust host, capabilities, icons, tauri.conf.json
```

## Commands (from the repo root)

```sh
pnpm --filter @know-meet/desktop tauri dev            # web dev server on 127.0.0.1:1420
pnpm --filter @know-meet/desktop tauri build --debug  # builds apps/web, then a .app bundle
```

`beforeDevCommand` / `beforeBuildCommand` run `@know-meet/web` through pnpm, so
the web build is produced once and embedded unchanged.

## Content-Security-Policy

`apps/web/scripts/content-security-policy.ts` is the single source. The web build
writes it as a `<meta>` tag; `scripts/tauri-cli.ts` merges the same string into
`app.security.csp` with `--config`. Set `KM_LIVEKIT_URL=wss://<host>` in the shell
to allow the LiveKit signalling (`wss:`) and region-discovery (`https:`) origins.
The value is a public URL; LiveKit API keys and secrets never reach the client.
The `csp` in `tauri.conf.json` is the fallback for running `cargo tauri`
directly, without LiveKit.

## Host prerequisites

macOS Xcode command-line tools; Windows MSVC and WebView2; Linux WebKitGTK 4.1
development libraries. Only the macOS `.app` bundle target is configured in this
phase. Windows x64/ARM64 need native build and GUI execution evidence; a Rust
cross-check alone does not certify a desktop app.

Rust: React → hook → entity graph → typed Tauri commands → `gen_ui_notes` →
SQLite in the OS app-data directory (`APP_DATA_DIR` overrides it). UAR is not
configured; no agent responses are simulated.

## Background throttling

The main window sets `"backgroundThrottling": "disabled"` in `tauri.conf.json`.
The window is built from that config entry, so no Rust code is involved. By
default WebKit suspends a hidden or minimised webview, which slows agent
streaming. Disabling it keeps streams fast when the window is minimised.

Trade-off: the webview keeps running while minimised, so the app uses more
battery and CPU in the background. The operator accepted this on 2026-11-11.

Platform scope: Tauri supports this key on macOS 14+ and iOS 17+ only. It has
no effect on Windows or Linux.

Evidence: `spikes/agentic-ui/own/gates/16-1-scheduler.md`. With Tauri's default
throttling, minimised p95 time-to-first-token was 9.09x the focused baseline
and the gate failed. With throttling disabled it stayed within 1.39x.
