//! Shared helpers for the handler tests. The router is the production one from
//! `build_router`, with obviously fake LiveKit credentials. Requests go through
//! `tower::ServiceExt::oneshot`; no socket is opened.
#![allow(dead_code)]

use std::collections::HashMap;
use std::net::SocketAddr;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::ConnectInfo;
use axum::http::{HeaderMap, Request, StatusCode, header};
use km_token_service::config::env;
use km_token_service::{Config, build_router};
use serde_json::Value;
use tower::ServiceExt;

pub const SITE: &str = "https://meet.example.test";
pub const FOREIGN: &str = "https://attacker.example";
pub const LIVEKIT_URL: &str = "wss://example.livekit.invalid";
pub const FAKE_KEY: &str = "APIfakehandlertestkey";
pub const FAKE_SECRET: &str = "fake-secret-for-handler-tests-not-a-credential";
/// The Gateway, as the TCP peer of every request.
pub const GATEWAY_PEER: &str = "10.0.0.5:40000";
pub const CLIENT_A: &str = "203.0.113.7";
pub const CLIENT_B: &str = "198.51.100.2";

pub fn config(overrides: &[(&'static str, &str)]) -> Config {
    let mut vars: HashMap<&'static str, String> = HashMap::from([
        (env::LIVEKIT_URL, LIVEKIT_URL.to_owned()),
        (env::LIVEKIT_API_KEY, FAKE_KEY.to_owned()),
        (env::LIVEKIT_API_SECRET, FAKE_SECRET.to_owned()),
        (env::SITE_ORIGIN, SITE.to_owned()),
        (env::TRUSTED_PROXY_HOPS, "1".to_owned()),
        (env::TOKEN_TTL_SECONDS, "600".to_owned()),
        (env::RATE_LIMIT_BURST, "5".to_owned()),
        (env::RATE_LIMIT_REFILL_SECONDS, "60".to_owned()),
    ]);
    for &(name, value) in overrides {
        vars.insert(name, value.to_owned());
    }
    Config::from_lookup(&|name: &str| vars.get(name).cloned()).unwrap()
}

pub fn app(overrides: &[(&'static str, &str)]) -> Router {
    build_router(config(overrides))
}

pub struct Reply {
    pub status: StatusCode,
    pub headers: HeaderMap,
    pub text: String,
    pub body: Value,
}

impl Reply {
    pub fn error_code(&self) -> Option<&str> {
        self.body.get("error").and_then(|e| e.get("code")).and_then(Value::as_str)
    }

    /// Mirrors `carriesToken` in tests/release/src/api-contract.ts.
    pub fn carries_token(&self) -> bool {
        self.text.contains("\"token\"")
    }
}

pub async fn send(app: &Router, request: Request<Body>) -> Reply {
    let response = app.clone().oneshot(request).await.unwrap();
    let (parts, body) = response.into_parts();
    let bytes = to_bytes(body, 64 * 1024).await.unwrap();
    let text = String::from_utf8(bytes.to_vec()).unwrap();
    let body = if text.is_empty() { Value::Null } else { serde_json::from_str(&text).unwrap() };
    Reply { status: parts.status, headers: parts.headers, text, body }
}

pub struct Post<'a> {
    pub path: &'a str,
    pub body: String,
    pub origin: Option<&'a str>,
    pub content_type: Option<&'a str>,
    pub forwarded_for: Option<&'a str>,
}

impl<'a> Post<'a> {
    pub fn new(path: &'a str, body: impl Into<String>) -> Self {
        Self {
            path,
            body: body.into(),
            origin: Some(SITE),
            content_type: Some("application/json"),
            forwarded_for: Some(CLIENT_A),
        }
    }

    pub fn request(self) -> Request<Body> {
        let peer: SocketAddr = GATEWAY_PEER.parse().unwrap();
        let mut builder = Request::builder().method("POST").uri(self.path).extension(ConnectInfo(peer));
        if let Some(origin) = self.origin {
            builder = builder.header(header::ORIGIN, origin);
        }
        if let Some(content_type) = self.content_type {
            builder = builder.header(header::CONTENT_TYPE, content_type);
        }
        if let Some(forwarded_for) = self.forwarded_for {
            builder = builder.header("x-forwarded-for", forwarded_for);
        }
        builder.body(Body::from(self.body)).unwrap()
    }
}

pub fn token_body(code: &str, name: &str) -> String {
    serde_json::json!({ "code": code, "name": name }).to_string()
}

pub async fn create_meeting(app: &Router, forwarded_for: &str) -> Reply {
    let mut post = Post::new("/api/meetings", "{}");
    post.forwarded_for = Some(forwarded_for);
    send(app, post.request()).await
}

/// Creates a meeting as `forwarded_for` and returns its code, asserting 201.
pub async fn issued_code(app: &Router, forwarded_for: &str) -> String {
    let reply = create_meeting(app, forwarded_for).await;
    assert_eq!(reply.status, StatusCode::CREATED, "{}", reply.text);
    reply.body["data"]["code"].as_str().unwrap().to_owned()
}

pub async fn request_token(app: &Router, code: &str, name: &str, forwarded_for: &str) -> Reply {
    let mut post = Post::new("/api/token", token_body(code, name));
    post.forwarded_for = Some(forwarded_for);
    send(app, post.request()).await
}
