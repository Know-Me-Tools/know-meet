//! `/api` handlers. Every POST runs the same gate, in this order: `Origin`, rate limit,
//! `Content-Type`, body size. A refused `Origin` costs no rate-limit token; every
//! request that passes it does, whether or not it then succeeds.

use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;
use std::time::Instant;

use axum::Json;
use axum::body::{Bytes, to_bytes};
use axum::extract::{ConnectInfo, Request, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};

use super::client_addr::client_address;
use super::error::ApiError;
use super::guards::{is_json, origin_allowed};
use crate::application::{MeetingService, RateLimiter};
use crate::domain::Decision;

pub const MAX_BODY_BYTES: usize = 4096;

pub struct Shared {
    pub meetings: MeetingService,
    pub limiter: RateLimiter,
    pub site_origin: String,
    /// Public `wss://` URL handed to clients.
    pub livekit_url: String,
    pub trusted_hops: usize,
}

#[derive(Clone)]
pub struct AppState(pub Arc<Shared>);

#[derive(Serialize)]
struct Success<T> {
    ok: bool,
    data: T,
}

fn success<T: Serialize>(status: StatusCode, data: T) -> Response {
    (status, Json(Success { ok: true, data })).into_response()
}

#[derive(Serialize)]
struct Health {
    status: &'static str,
}

#[derive(Serialize)]
struct CreatedMeeting<'a> {
    code: &'a str,
}

/// `POST /api/meetings` takes an empty object and nothing else.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CreateMeetingBody {}

#[derive(Deserialize)]
struct TokenBody {
    code: String,
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TokenData<'a> {
    url: &'a str,
    token: &'a str,
    identity: &'a str,
    room: &'a str,
    expires_in: u64,
}

const BODY_MESSAGE: &str = "Send a JSON body of at most 4096 bytes with Content-Type application/json.";

/// `GET /api/healthz`: no Origin, no rate limit, nothing derived from configuration.
pub async fn health() -> Response {
    success(StatusCode::OK, Health { status: "ok" })
}

pub async fn create_meeting(State(state): State<AppState>, request: Request) -> Result<Response, ApiError> {
    let body = gate(&state.0, request).await?;
    serde_json::from_slice::<CreateMeetingBody>(&body).map_err(|_| ApiError::InvalidRequest(BODY_MESSAGE))?;
    let code = state.0.meetings.create_meeting(Instant::now()).map_err(log_failure)?;
    tracing::info!(event = "meeting_created");
    Ok(success(StatusCode::CREATED, CreatedMeeting { code: code.as_str() }))
}

pub async fn issue_token(State(state): State<AppState>, request: Request) -> Result<Response, ApiError> {
    let body = gate(&state.0, request).await?;
    let TokenBody { code, name } =
        serde_json::from_slice(&body).map_err(|_| ApiError::InvalidRequest(BODY_MESSAGE))?;
    let grant = state.0.meetings.issue_token(&code, &name, Instant::now()).map_err(log_failure)?;
    tracing::info!(event = "token_issued", expires_in = grant.expires_in_secs);
    Ok(success(
        StatusCode::OK,
        TokenData {
            url: &state.0.livekit_url,
            token: &grant.token,
            identity: &grant.identity,
            room: grant.room.as_str(),
            expires_in: grant.expires_in_secs,
        },
    ))
}

/// Logs the outcome class only: never the code, the name, the token or the address.
fn log_failure(error: crate::application::MeetingError) -> ApiError {
    let api = ApiError::from(error);
    tracing::info!(event = "request_refused", code = api.code());
    api
}

async fn gate(shared: &Shared, request: Request) -> Result<Bytes, ApiError> {
    let (parts, body) = request.into_parts();
    if !origin_allowed(&parts.headers, &shared.site_origin) {
        tracing::info!(event = "request_refused", code = "forbidden-origin");
        return Err(ApiError::ForbiddenOrigin);
    }
    let peer = parts.extensions.get::<ConnectInfo<SocketAddr>>().map(|info| info.0.ip());
    // No address at all only happens without connect info (never in `serve`); such
    // requests share one bucket rather than going unlimited.
    let client = client_address(&parts.headers, peer, shared.trusted_hops)
        .unwrap_or(IpAddr::V4(Ipv4Addr::UNSPECIFIED));
    if let Decision::Limited { retry_after } = shared.limiter.check(client, Instant::now()) {
        tracing::info!(event = "request_refused", code = "rate-limited");
        return Err(ApiError::rate_limited(retry_after));
    }
    if !is_json(&parts.headers) {
        return Err(ApiError::InvalidRequest(BODY_MESSAGE));
    }
    to_bytes(body, MAX_BODY_BYTES).await.map_err(|_| ApiError::InvalidRequest(BODY_MESSAGE))
}
