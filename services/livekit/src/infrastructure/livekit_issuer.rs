//! Signs LiveKit guest tokens with `livekit-api` (feature `access-token` only).
//!
//! The grant is the narrowest that lets a guest take part: join one room, publish,
//! subscribe and send data. No room admin, create, list or record, no ingress admin,
//! no metadata self-update, not hidden, not a recorder or agent.
//!
//! Room limits travel in the token's `roomConfig`. LiveKit applies a token's room
//! configuration when that join creates the room; it does not change a room that
//! already exists. Every room here is created by the first guest's join, so the first
//! token's limits apply.

use std::time::Duration;

use livekit_api::access_token::{AccessToken, VideoGrants};
use livekit_protocol::RoomConfiguration;

use crate::application::{IssueError, IssuedToken, TokenIssuer, TokenRequest};
use crate::config::SecretString;
use crate::domain::RoomCode;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RoomLimits {
    pub max_participants: u32,
    /// Seconds a room may stay empty: before anyone joins (`emptyTimeout`) and after the
    /// last participant leaves (`departureTimeout`).
    pub empty_timeout_secs: u32,
}

#[derive(Debug)]
pub struct LiveKitTokenIssuer {
    api_key: SecretString,
    api_secret: SecretString,
    ttl: Duration,
    limits: RoomLimits,
}

impl LiveKitTokenIssuer {
    pub fn new(api_key: SecretString, api_secret: SecretString, ttl: Duration, limits: RoomLimits) -> Self {
        Self { api_key, api_secret, ttl, limits }
    }

    fn room_config(&self) -> RoomConfiguration {
        RoomConfiguration {
            max_participants: self.limits.max_participants,
            empty_timeout: self.limits.empty_timeout_secs,
            departure_timeout: self.limits.empty_timeout_secs,
            ..RoomConfiguration::default()
        }
    }
}

/// The guest grant for exactly one room.
pub fn guest_grants(room: &RoomCode) -> VideoGrants {
    VideoGrants {
        room_join: true,
        room: room.as_str().to_owned(),
        can_publish: Some(true),
        can_subscribe: Some(true),
        can_publish_data: Some(true),
        can_update_own_metadata: Some(false),
        room_create: false,
        room_list: false,
        room_record: false,
        room_admin: false,
        ingress_admin: false,
        hidden: false,
        recorder: false,
        agent: false,
        ..VideoGrants::default()
    }
}

impl TokenIssuer for LiveKitTokenIssuer {
    fn issue(&self, request: &TokenRequest<'_>) -> Result<IssuedToken, IssueError> {
        let token = AccessToken::with_api_key(self.api_key.expose(), self.api_secret.expose())
            .with_identity(request.identity)
            .with_name(request.name.as_str())
            .with_ttl(self.ttl)
            .with_grants(guest_grants(request.room))
            .with_room_config(self.room_config())
            .to_jwt()
            .map_err(|error| {
                // AccessTokenError's messages are fixed strings; none carries key material.
                tracing::error!(event = "token_signing_failed", %error);
                IssueError
            })?;
        Ok(IssuedToken { token, expires_in_secs: self.ttl.as_secs() })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::DisplayName;
    use livekit_api::access_token::TokenVerifier;
    use std::time::{SystemTime, UNIX_EPOCH};

    const FAKE_KEY: &str = "APIfakekeyfortests";
    const FAKE_SECRET: &str = "fake-secret-for-unit-tests-only-not-a-real-credential";

    fn issuer(ttl_secs: u64) -> LiveKitTokenIssuer {
        LiveKitTokenIssuer::new(
            SecretString::new(FAKE_KEY.to_owned()),
            SecretString::new(FAKE_SECRET.to_owned()),
            Duration::from_secs(ttl_secs),
            RoomLimits { max_participants: 8, empty_timeout_secs: 120 },
        )
    }

    fn now_secs() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    }

    #[test]
    fn signs_a_token_scoped_to_one_room_with_the_configured_lifetime() {
        let room = RoomCode::parse("km-abc-def").unwrap();
        let name = DisplayName::parse("Guest A").unwrap();
        let before = now_secs();
        let issued = issuer(600)
            .issue(&TokenRequest { room: &room, identity: "guest-a-0011", name: &name })
            .unwrap();
        assert_eq!(issued.expires_in_secs, 600);

        let claims = TokenVerifier::with_api_key(FAKE_KEY, FAKE_SECRET).verify(&issued.token).unwrap();
        assert_eq!(claims.iss, FAKE_KEY);
        assert_eq!(claims.sub, "guest-a-0011");
        assert_eq!(claims.name, "Guest A");
        let video = &claims.video;
        assert_eq!(video.room, "km-abc-def");
        assert!(video.room_join);
        assert!(video.can_publish() && video.can_subscribe() && video.can_publish_data());
        assert!(!video.room_admin && !video.room_create && !video.room_list && !video.room_record);
        assert!(!video.ingress_admin && !video.hidden && !video.recorder && !video.agent);
        assert!(!video.can_update_own_metadata());
        assert!(video.destination_room.is_empty());

        let exp = u64::try_from(claims.exp).unwrap();
        assert!(exp <= now_secs() + 600 && exp >= before + 599, "exp {exp}");

        let config = claims.room_config.unwrap();
        assert_eq!(config.max_participants, 8);
        assert_eq!(config.empty_timeout, 120);
        assert_eq!(config.departure_timeout, 120);
        assert!(config.agents.is_empty() && config.egress.is_none());
    }

    #[test]
    fn a_token_signed_with_another_secret_does_not_verify() {
        let room = RoomCode::parse("km-abc-def").unwrap();
        let name = DisplayName::parse("Guest A").unwrap();
        let issued = issuer(600)
            .issue(&TokenRequest { room: &room, identity: "guest-a-0011", name: &name })
            .unwrap();
        assert!(TokenVerifier::with_api_key(FAKE_KEY, "another-secret").verify(&issued.token).is_err());
    }

    #[test]
    fn debug_output_redacts_the_key_and_secret() {
        let text = format!("{:?}", issuer(600));
        assert!(!text.contains(FAKE_SECRET) && !text.contains(FAKE_KEY));
    }
}
