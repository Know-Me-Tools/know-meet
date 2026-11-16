//! Process entry: logging, configuration, signals. Writes no files.

use std::process::ExitCode;

use km_token_service::{Config, serve};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> ExitCode {
    init_tracing();
    let config = match Config::from_env() {
        Ok(config) => config,
        Err(error) => {
            // The message names the variable only, never a value.
            tracing::error!(event = "configuration_error", %error);
            return ExitCode::FAILURE;
        }
    };
    match serve(config, shutdown_signal()).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            tracing::error!(event = "server_error", %error);
            ExitCode::FAILURE
        }
    }
}

/// JSON lines on stdout. `RUST_LOG` overrides the default `info` level.
fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    if tracing_subscriber::fmt().json().with_env_filter(filter).try_init().is_err() {
        eprintln!("km-token-service: a global logger was already installed");
    }
}

/// Resolves on SIGTERM (Kubernetes) or Ctrl-C. If a handler cannot be installed, that
/// signal is logged and ignored rather than shutting the server down at once.
async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(error) = tokio::signal::ctrl_c().await {
            tracing::warn!(event = "signal_handler_failed", signal = "ctrl-c", %error);
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};
        match signal(SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(error) => {
                tracing::warn!(event = "signal_handler_failed", signal = "sigterm", %error);
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
    tracing::info!(event = "shutdown_requested");
}
