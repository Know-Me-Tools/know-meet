//! Cross-cutting response behaviour: headers, request timeout, access log.

use std::time::{Duration, Instant};

use axum::extract::{Request, State};
use axum::http::{HeaderValue, header};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};

use super::error::ApiError;

const KNOWN_PATHS: [&str; 3] = ["/api/healthz", "/api/meetings", "/api/token"];

/// Every response, including errors, 404 and 405, is uncacheable and not sniffable.
pub async fn response_headers(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    response
}

/// Bounds the whole handler, including reading the body.
pub async fn request_timeout(State(limit): State<Duration>, request: Request, next: Next) -> Response {
    match tokio::time::timeout(limit, next.run(request)).await {
        Ok(response) => response,
        Err(_) => {
            tracing::warn!(event = "request_timed_out");
            ApiError::Timeout.into_response()
        }
    }
}

/// One line per request: method, a known path or `other`, status and latency.
/// No headers, query strings, bodies or addresses are logged.
pub async fn access_log(request: Request, next: Next) -> Response {
    let started = Instant::now();
    let method = request.method().clone();
    let path = KNOWN_PATHS.iter().find(|known| **known == request.uri().path()).copied().unwrap_or("other");
    let response = next.run(request).await;
    tracing::info!(
        event = "http_request",
        method = %method,
        path,
        status = response.status().as_u16(),
        elapsed_ms = u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
    );
    response
}
