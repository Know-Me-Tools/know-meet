# c15 spike: minimal Tauri 2 shell (task 15.5)

A minimal Tauri 2 app that loads one prototype's Vite `dist/` from `tauri://localhost`. It exists so that
prototypes H and O can be measured inside a real macOS WKWebView. It is standalone, with its own Cargo
`[workspace]`, and is not part of the root Cargo or pnpm workspaces. There are no IPC commands and no
capabilities.

Pins: `tauri` 2.11.3 and `tauri-build` 2.6.3 (the same as `apps/desktop`), CLI `tauri-cli` 2.11.4 and
Rust 1.97.1 (from `tooling/versions.toml`).

```bash
(cd ../own && pnpm build)
RUSTC_WRAPPER= node scripts/build-shell.ts own          # -> bin/km-spike-own
RUSTC_WRAPPER= node scripts/build-shell.ts hybrid media # variant: img-src/media-src also allow the harness origin
```

`build-shell.ts` computes the CSP from `apps/web/scripts/content-security-policy.ts` and appends
`connect-src http://127.0.0.1:4317`. It writes `src-tauri/tauri.<prototype>.generated.json`, which sets
`frontendDist` and the CSP, and runs `cargo tauri build --no-bundle --config <that file>`.

`RUSTC_WRAPPER=` bypasses this machine's global sccache wrapper, which hung.

At run time the app reads two environment variables:

- `KM_DRIVER_SCRIPT`: a path. The script there becomes the window's initialization script. It is the
  harness's in-webview driver; see `../harness/README.md`, "Tauri (WKWebView) runs".
- `KM_BACKGROUND_THROTTLING=default`: keeps WebKit's throttling of hidden views. The default disables it.

The runs and their results are in `../measurements/comparison.md`.
