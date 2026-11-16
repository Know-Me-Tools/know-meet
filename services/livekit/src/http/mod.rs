//! HTTP edge: routes, request gate, error envelope.

pub mod client_addr;
pub mod error;
pub mod guards;
pub mod handlers;
pub mod middleware;

use std::time::Duration;

use axum::Router;
use axum::routing::{get, post};

pub use error::ApiError;
pub use handlers::{AppState, MAX_BODY_BYTES, Shared};

/// Same-origin `/api` routes. The outermost layer sets response headers, so even a
/// timeout or an unknown path gets `Cache-Control: no-store`.
pub fn router(state: AppState, request_timeout: Duration) -> Router {
    Router::new()
        .route("/api/healthz", get(handlers::health))
        .route("/api/meetings", post(handlers::create_meeting))
        .route("/api/token", post(handlers::issue_token))
        .with_state(state)
        .layer(axum::middleware::from_fn_with_state(request_timeout, middleware::request_timeout))
        .layer(axum::middleware::from_fn(middleware::access_log))
        .layer(axum::middleware::from_fn(middleware::response_headers))
}
