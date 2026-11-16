//! Token service contract (tests/release/src/api-contract.ts) and the token-service
//! spec scenarios "Token for a generated room" and "Arbitrary room refused".

mod common;

use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use common::*;
use km_token_service::config::env;
use km_token_service::domain::RoomCode;
use livekit_api::access_token::TokenVerifier;

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
}

#[tokio::test]
async fn health_needs_no_origin_and_reveals_nothing_else() {
    let app = app(&[]);
    let request = Request::builder().uri("/api/healthz").body(Body::empty()).unwrap();
    let reply = send(&app, request).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_eq!(reply.body, serde_json::json!({ "ok": true, "data": { "status": "ok" } }));
    assert_eq!(reply.headers[header::CACHE_CONTROL], "no-store");
}

#[tokio::test]
async fn create_meeting_returns_a_service_generated_code() {
    let app = app(&[]);
    let reply = create_meeting(&app, CLIENT_A).await;
    assert_eq!(reply.status, StatusCode::CREATED);
    assert_eq!(reply.body["ok"], true);
    let code = reply.body["data"]["code"].as_str().unwrap();
    assert!(RoomCode::parse(code).is_some(), "{code}");
    assert_eq!(reply.headers[header::CACHE_CONTROL], "no-store");
}

#[tokio::test]
async fn a_token_for_a_generated_code_joins_only_that_room_and_expires_soon() {
    let app = app(&[(env::TOKEN_TTL_SECONDS, "600")]);
    let code = issued_code(&app, CLIENT_A).await;
    let before = now_secs();
    let reply = request_token(&app, &code, "Guest A", CLIENT_A).await;
    assert_eq!(reply.status, StatusCode::OK, "{}", reply.text);
    assert_eq!(reply.headers[header::CACHE_CONTROL], "no-store");

    let data = &reply.body["data"];
    assert_eq!(data["url"], LIVEKIT_URL);
    assert_eq!(data["room"], code.as_str());
    assert_eq!(data["expiresIn"], 600);
    let identity = data["identity"].as_str().unwrap();
    assert!(identity.starts_with("guest-a-"), "{identity}");

    let token = data["token"].as_str().unwrap();
    let claims = TokenVerifier::with_api_key(FAKE_KEY, FAKE_SECRET).verify(token).unwrap();
    assert_eq!(claims.sub, identity);
    assert_eq!(claims.video.room, code);
    assert!(claims.video.room_join);
    assert!(!claims.video.room_admin, "no roomAdmin");
    assert!(!claims.video.room_create, "no roomCreate");
    assert!(!claims.video.room_list, "no roomList");
    assert!(!claims.video.room_record, "no roomRecord");
    assert!(!claims.video.ingress_admin, "no ingressAdmin");
    let exp = u64::try_from(claims.exp).unwrap();
    assert!(exp > before && exp <= now_secs() + 600, "exp {exp}");
    assert!(!reply.text.contains(FAKE_SECRET));
}

#[tokio::test]
async fn the_identity_is_never_client_chosen() {
    let app = app(&[]);
    let code = issued_code(&app, CLIENT_A).await;
    let body = serde_json::json!({ "code": code, "name": "Guest A", "identity": "admin" }).to_string();
    let reply = send(&app, Post::new("/api/token", body).request()).await;
    assert_eq!(reply.status, StatusCode::OK);
    assert_ne!(reply.body["data"]["identity"], "admin");
}

#[tokio::test]
async fn an_arbitrary_client_chosen_room_is_refused_with_404_and_no_token() {
    let app = app(&[]);
    let issued = issued_code(&app, CLIENT_A).await;
    let unissued = if issued == "km-zzz-zz9" { "km-zzz-zz8" } else { "km-zzz-zz9" };
    for room in [unissued, "standup", "", "KM-ABC-DEF"] {
        let reply = request_token(&app, room, "Guest A", CLIENT_B).await;
        assert_eq!(reply.status, StatusCode::NOT_FOUND, "room {room:?}");
        assert_eq!(reply.body["ok"], false);
        assert_eq!(reply.error_code(), Some("meeting-not-found"));
        assert!(reply.body["error"]["message"].is_string());
        assert!(!reply.carries_token(), "room {room:?}");
        assert_eq!(reply.headers[header::CACHE_CONTROL], "no-store");
    }
}

#[tokio::test]
async fn malformed_requests_are_400_invalid_request() {
    let app = app(&[(env::RATE_LIMIT_BURST, "100")]);
    let code = issued_code(&app, CLIENT_A).await;
    let cases: Vec<Post<'_>> = vec![
        Post::new("/api/token", serde_json::json!({ "code": code }).to_string()),
        Post::new("/api/token", token_body(&code, "   ")),
        Post::new("/api/token", token_body(&code, &"x".repeat(61))),
        Post::new("/api/token", "not json"),
        Post::new("/api/token", format!("{{\"code\":\"{code}\",\"name\":\"{}\"}}", "a".repeat(5000))),
        Post::new("/api/meetings", "{\"room\":\"standup\"}"),
        Post::new("/api/meetings", ""),
        Post { content_type: Some("text/plain"), ..Post::new("/api/token", token_body(&code, "A")) },
        Post { content_type: None, ..Post::new("/api/meetings", "{}") },
    ];
    for (index, post) in cases.into_iter().enumerate() {
        let reply = send(&app, post.request()).await;
        assert_eq!(reply.status, StatusCode::BAD_REQUEST, "case {index}: {}", reply.text);
        assert_eq!(reply.error_code(), Some("invalid-request"), "case {index}");
        assert!(!reply.carries_token(), "case {index}");
    }
}

#[tokio::test]
async fn a_sixty_character_name_is_accepted() {
    let app = app(&[]);
    let code = issued_code(&app, CLIENT_A).await;
    let reply = request_token(&app, &code, &"x".repeat(60), CLIENT_A).await;
    assert_eq!(reply.status, StatusCode::OK);
}

#[tokio::test]
async fn a_full_code_store_refuses_new_meetings() {
    let app = app(&[(env::MAX_STORED_CODES, "1")]);
    issued_code(&app, CLIENT_A).await;
    let reply = create_meeting(&app, CLIENT_A).await;
    assert_eq!(reply.status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(reply.error_code(), Some("capacity-exceeded"));
}

#[tokio::test]
async fn unknown_paths_and_methods_are_also_uncacheable() {
    let app = app(&[]);
    let unknown = send(&app, Request::builder().uri("/api/rooms").body(Body::empty()).unwrap()).await;
    assert_eq!(unknown.status, StatusCode::NOT_FOUND);
    assert_eq!(unknown.headers[header::CACHE_CONTROL], "no-store");
    let get_token = send(&app, Request::builder().uri("/api/token").body(Body::empty()).unwrap()).await;
    assert_eq!(get_token.status, StatusCode::METHOD_NOT_ALLOWED);
    assert_eq!(get_token.headers[header::CACHE_CONTROL], "no-store");
}
