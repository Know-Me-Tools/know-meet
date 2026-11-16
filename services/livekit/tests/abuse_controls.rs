//! WR-4 abuse controls (features/wr-4-token-abuse.feature) and the token-service spec
//! scenarios "Rate limit", "Foreign origin" and "Client address behind the Gateway",
//! including both WR-4 negative controls.

mod common;

use axum::http::{StatusCode, header};
use common::*;
use km_token_service::config::env;

const BURST: usize = 5;

fn limited_app() -> axum::Router {
    app(&[(env::RATE_LIMIT_BURST, "5"), (env::RATE_LIMIT_REFILL_SECONDS, "60")])
}

#[tokio::test]
async fn a_foreign_or_missing_origin_is_refused_on_both_endpoints() {
    let app = limited_app();
    let code = issued_code(&app, CLIENT_A).await;
    for origin in [Some(FOREIGN), None, Some("null")] {
        let create = send(&app, Post { origin, ..Post::new("/api/meetings", "{}") }.request()).await;
        assert_eq!(create.status, StatusCode::FORBIDDEN, "create, origin {origin:?}");
        assert_eq!(create.error_code(), Some("forbidden-origin"));

        let token = send(&app, Post { origin, ..Post::new("/api/token", token_body(&code, "Guest A")) }.request()).await;
        assert_eq!(token.status, StatusCode::FORBIDDEN, "token, origin {origin:?}");
        assert_eq!(token.error_code(), Some("forbidden-origin"));
        assert!(!token.carries_token());
        assert_eq!(token.headers[header::CACHE_CONTROL], "no-store");
    }
}

#[tokio::test]
async fn refused_origins_do_not_spend_the_clients_bucket() {
    let app = app(&[(env::RATE_LIMIT_BURST, "2")]);
    for _ in 0..5 {
        let reply = send(&app, Post { origin: Some(FOREIGN), ..Post::new("/api/meetings", "{}") }.request()).await;
        assert_eq!(reply.status, StatusCode::FORBIDDEN);
    }
    let code = issued_code(&app, CLIENT_A).await;
    assert_eq!(request_token(&app, &code, "Guest A", CLIENT_A).await.status, StatusCode::OK);
}

/// Negative control: one create plus `burst - 2` tokens is one under the burst.
#[tokio::test]
async fn a_burst_below_the_limit_succeeds() {
    let app = limited_app();
    let code = issued_code(&app, CLIENT_A).await;
    for i in 0..BURST - 2 {
        let reply = request_token(&app, &code, &format!("Guest {i}"), CLIENT_A).await;
        assert_eq!(reply.status, StatusCode::OK, "request {i}");
    }
}

/// Mirrors token-abuse.spec.ts: create, then `burst + 2` token requests; every request
/// after the first `burst - 1` tokens is 429 with `Retry-After`.
#[tokio::test]
async fn requests_above_the_per_client_rate_receive_429() {
    let app = limited_app();
    let code = issued_code(&app, CLIENT_A).await;
    let mut replies = Vec::new();
    for i in 0..BURST + 2 {
        replies.push(request_token(&app, &code, &format!("Guest {i}"), CLIENT_A).await);
    }
    let (within, beyond) = replies.split_at(BURST - 1);
    assert!(within.iter().all(|r| r.status == StatusCode::OK));
    assert_eq!(beyond.len(), 3);
    for reply in beyond {
        assert_eq!(reply.status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(reply.error_code(), Some("rate-limited"));
        assert!(!reply.carries_token());
        let retry: u64 = reply.headers[header::RETRY_AFTER].to_str().unwrap().parse().unwrap();
        assert!((1..=60).contains(&retry), "Retry-After {retry}");
        assert_eq!(reply.headers[header::CACHE_CONTROL], "no-store");
    }
}

#[tokio::test]
async fn both_post_endpoints_share_one_bucket() {
    let app = app(&[(env::RATE_LIMIT_BURST, "2")]);
    let code = issued_code(&app, CLIENT_A).await;
    issued_code(&app, CLIENT_A).await;
    let reply = request_token(&app, &code, "Guest A", CLIENT_A).await;
    assert_eq!(reply.status, StatusCode::TOO_MANY_REQUESTS);
}

#[tokio::test]
async fn the_limit_keys_on_the_forwarded_client_not_the_gateway_or_a_forged_entry() {
    let app = app(&[(env::RATE_LIMIT_BURST, "2"), (env::TRUSTED_PROXY_HOPS, "1")]);
    let a_forged_1 = format!("6.6.6.6, {CLIENT_A}");
    let a_forged_2 = format!("9.9.9.9, {CLIENT_A}");
    issued_code(&app, &a_forged_1).await;
    issued_code(&app, &a_forged_2).await;
    // Client A has spent its bucket; a new forged leftmost entry does not buy a new one.
    let forged = create_meeting(&app, &format!("1.2.3.4, {CLIENT_A}")).await;
    assert_eq!(forged.status, StatusCode::TOO_MANY_REQUESTS);
    // Client B arrives through the same Gateway peer and has its own bucket.
    assert_eq!(create_meeting(&app, CLIENT_B).await.status, StatusCode::CREATED);
}

#[tokio::test]
async fn with_zero_trusted_hops_the_forwarded_header_is_ignored() {
    let app = app(&[(env::RATE_LIMIT_BURST, "1"), (env::TRUSTED_PROXY_HOPS, "0")]);
    assert_eq!(create_meeting(&app, CLIENT_A).await.status, StatusCode::CREATED);
    // Same TCP peer, different header: still the same bucket.
    assert_eq!(create_meeting(&app, CLIENT_B).await.status, StatusCode::TOO_MANY_REQUESTS);
}
