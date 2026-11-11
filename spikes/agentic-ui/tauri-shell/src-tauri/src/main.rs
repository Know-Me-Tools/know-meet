// c15 task 15.5 spike shell: one window that loads the embedded prototype dist
// (tauri://localhost/index.html). macOS WKWebView has no WebDriver, so a driver
// script (KM_DRIVER_SCRIPT, built by the harness) is installed as the window's
// initialization script; it reports to the harness collector over HTTP. No IPC
// commands, no capabilities.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, fs};
use tauri::utils::config::BackgroundThrottlingPolicy;
use tauri::{WebviewUrl, WebviewWindowBuilder};

const DRIVER_ENV: &str = "KM_DRIVER_SCRIPT";
/// `default` keeps WebKit's throttling of hidden/occluded views; anything else disables it.
const THROTTLING_ENV: &str = "KM_BACKGROUND_THROTTLING";

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let mut builder =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                    .title("Know Meet agentic-UI spike")
                    .inner_size(1280.0, 720.0)
                    .focused(true);
            if env::var(THROTTLING_ENV).as_deref() != Ok("default") {
                builder = builder.background_throttling(BackgroundThrottlingPolicy::Disabled);
            }
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
