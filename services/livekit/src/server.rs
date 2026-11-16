//! Composition root: wires configuration, adapters and use cases into the router,
//! then serves it until the shutdown signal resolves.

use std::future::Future;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::Router;
use tokio::net::TcpListener;

use crate::application::{CodePolicy, CodeStore, MeetingService, RateLimiter};
use crate::config::Config;
use crate::domain::BucketPolicy;
use crate::http::{AppState, Shared, router};
use crate::infrastructure::{LiveKitTokenIssuer, SystemRandom};

/// Upper bound on distinct client buckets held in memory.
const MAX_TRACKED_CLIENTS: usize = 100_000;

/// Builds the full production router from `config`. Consumes the secrets.
pub fn build_router(config: Config) -> Router {
    let Config {
        livekit,
        site_origin,
        trusted_proxy_hops,
        token_ttl,
        rate_limit,
        meeting_rate_limit,
        code_ttl,
        unused_code_ttl,
        max_stored_codes,
        max_codes_per_client,
        max_used_codes_per_client,
        request_timeout,
        room,
        ..
    } = config;
    let issuer = LiveKitTokenIssuer::new(livekit.api_key, livekit.api_secret, token_ttl, room);
    let codes = CodeStore::new(CodePolicy {
        unused_ttl: unused_code_ttl,
        used_ttl: code_ttl,
        capacity: max_stored_codes,
        per_owner_unused: max_codes_per_client,
        per_owner_used: max_used_codes_per_client,
    });
    let meetings = MeetingService::new(codes, Arc::new(SystemRandom), Arc::new(issuer));
    let limiter = RateLimiter::new(BucketPolicy::new(rate_limit.burst, rate_limit.refill), MAX_TRACKED_CLIENTS);
    let meeting_limiter = RateLimiter::new(
        BucketPolicy::new(meeting_rate_limit.burst, meeting_rate_limit.refill),
        MAX_TRACKED_CLIENTS,
    );
    let shared = Shared {
        meetings,
        limiter,
        meeting_limiter,
        site_origin,
        livekit_url: livekit.url,
        trusted_hops: trusted_proxy_hops,
    };
    router(AppState(Arc::new(shared)), request_timeout)
}

/// Binds `config.bind_addr` and serves until `shutdown` resolves, then lets in-flight
/// requests finish (each is bounded by the request timeout).
pub async fn serve<F>(config: Config, shutdown: F) -> std::io::Result<()>
where
    F: Future<Output = ()> + Send + 'static,
{
    let bind_addr = config.bind_addr;
    tracing::info!(
        event = "starting",
        %bind_addr,
        site_origin = %config.site_origin,
        trusted_proxy_hops = config.trusted_proxy_hops,
        token_ttl_secs = config.token_ttl.as_secs(),
        rate_limit_burst = config.rate_limit.burst,
        rate_limit_refill_secs = config.rate_limit.refill.as_secs(),
        meeting_rate_limit_burst = config.meeting_rate_limit.burst,
        meeting_rate_limit_refill_secs = config.meeting_rate_limit.refill.as_secs(),
        code_ttl_secs = config.code_ttl.as_secs(),
        unused_code_ttl_secs = config.unused_code_ttl.as_secs(),
        max_stored_codes = config.max_stored_codes,
        max_codes_per_client = config.max_codes_per_client,
        max_used_codes_per_client = config.max_used_codes_per_client,
        room_max_participants = config.room.max_participants,
        room_empty_timeout_secs = config.room.empty_timeout_secs,
    );
    let app = build_router(config);
    let listener = TcpListener::bind(bind_addr).await?;
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown)
        .await?;
    tracing::info!(event = "stopped");
    Ok(())
}
