## Context

Library and pattern decisions come from the Analyze stage (`.kbd-orchestrator/phases/web-release/library-candidates.json`).

## Decisions

### cand-003: livekit-api (feature access-token) (adopt)

Official Rust server SDK; the repo's services are Rust and Axum. Use default-features = false with access-token.

Evidence:

- Tier 3: cargo info: default features are services, access-token, webhooks; access-token alone depends only on livekit-token. (https://crates.io/crates/livekit-api/0.10.2)
- Tier 2: AccessToken::with_api_key(..).with_identity(..).with_grants(VideoGrants{room_join, room, ..}).with_ttl(..).to_jwt(); default TTL is 6 hours. (https://github.com/livekit/rust-sdks/blob/main/livekit-api/README.md)

Risks:

- Version 0.x: the API may change between minor releases.
- Default TTL is 6 hours; the service must set a short TTL explicitly.
- Not pinned in versions.toml.

### cand-004: docs/design/live/server.mjs (reference)

Behaviour reference for the new token endpoint.

Evidence:

- Tier 1: Mints HS256 tokens with roomJoin, canPublish and canPublishData; identity is a slug of the name plus random hex; response carries url, token, identity, room, expiresIn. (docs/design/live/server.mjs)
- Tier 1: The token service in services/livekit supersedes docs/design/live/server.mjs. (.agent-team/know-meet-team/team.json)

Risks:

- Frozen prototype code with no login; it must not be deployed.

### cand-020: tower_governor (reference)

Candidate for the per-IP rate limit on the token endpoint. Evaluate at spec time before hand-rolling. Behind the Gateway the client address comes from a forwarded header, which the limiter must be configured to trust correctly.

Evidence:

- Tier 3: cargo search: tower_governor 0.8.0, a rate-limiting middleware for Tower backed by the governor crate. (https://crates.io/crates/tower_governor)

Risks:

- Only the registry listing was read; Axum 0.8 compatibility, key extraction behind a proxy and licence are unverified.
