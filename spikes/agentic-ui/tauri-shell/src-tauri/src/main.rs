// c15 task 15.5 spike shell: one window that loads the embedded prototype dist
// (tauri://localhost/index.html). macOS WKWebView has no WebDriver, so a driver
// script (KM_DRIVER_SCRIPT, built by the harness) is installed as the window's
// initialization script; it reports to the harness collector over HTTP. No IPC
// commands, no capabilities.
//
// Window source (gate 16.1, 2026-11-11):
// - If the build config declares a window labelled "main" (`create: false`), the
//   window is built from it, exactly as apps/desktop does. Its
//   `backgroundThrottling` then decides the policy and KM_BACKGROUND_THROTTLING is
//   ignored. O's gate build declares `"backgroundThrottling": "disabled"`, the
//   operator's product setting.
// - Otherwise (the H/O c15 builds) the window is built in code and
//   KM_BACKGROUND_THROTTLING applies as before.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, fs};
use tauri::utils::config::BackgroundThrottlingPolicy;
use tauri::{WebviewUrl, WebviewWindowBuilder};

const DRIVER_ENV: &str = "KM_DRIVER_SCRIPT";
/// `default` keeps WebKit's throttling of hidden/occluded views; anything else disables it.
/// Ignored when the config declares the "main" window.
const THROTTLING_ENV: &str = "KM_BACKGROUND_THROTTLING";
const MAIN_LABEL: &str = "main";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let configured = app
                .config()
                .app
                .windows
                .iter()
                .find(|w| w.label == MAIN_LABEL)
                .cloned();
            let mut builder = match configured {
                Some(window) => {
                    eprintln!(
                        "spike shell: window from config, background_throttling={:?}",
                        window.background_throttling
                    );
                    WebviewWindowBuilder::from_config(app.handle(), &window)?
                }
                None => {
                    let mut b = WebviewWindowBuilder::new(
                        app.handle(),
                        MAIN_LABEL,
                        WebviewUrl::App("index.html".into()),
                    )
                    .title("Know Meet agentic-UI spike")
                    .inner_size(1280.0, 720.0)
                    .focused(true);
                    if env::var(THROTTLING_ENV).as_deref() != Ok("default") {
                        b = b.background_throttling(BackgroundThrottlingPolicy::Disabled);
                    }
                    b
                }
            };
            if let Ok(path) = env::var(DRIVER_ENV) {
                let script = fs::read_to_string(&path)
                    .map_err(|e| format!("{DRIVER_ENV}={path}: {e}"))?;
                builder = builder.initialization_script(script);
            }
            builder.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("spike shell failed to run");
}
