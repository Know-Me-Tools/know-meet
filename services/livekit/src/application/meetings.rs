//! The two use cases: create a meeting (issue a room code) and issue a guest token
//! for a code this service issued.

use std::fmt;
use std::sync::Arc;
use std::time::Instant;

use thiserror::Error;

use super::code_store::{CodeStore, StoreError};
use super::ports::{IssueError, RandomError, RandomSource, TokenIssuer, TokenRequest};
use crate::domain::{DisplayName, DisplayNameError, RoomCode, participant_identity};

/// Collisions are about one in two billion per live code; a few retries suffice.
const MAX_CODE_ATTEMPTS: usize = 8;
/// 48 random bits per identity.
const IDENTITY_SUFFIX_BYTES: usize = 6;

#[derive(Debug, Error)]
pub enum MeetingError {
    #[error("invalid display name: {0}")]
    InvalidName(#[from] DisplayNameError),
    #[error("no live meeting has that code")]
    NotFound,
    #[error("no more meetings can be stored right now")]
    CapacityExceeded,
    #[error(transparent)]
    Random(#[from] RandomError),
    #[error(transparent)]
    Issue(#[from] IssueError),
}

pub struct TokenGrant {
    pub room: RoomCode,
    pub identity: String,
    pub token: String,
    pub expires_in_secs: u64,
}

impl fmt::Debug for TokenGrant {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TokenGrant")
            .field("room", &self.room)
            .field("identity", &self.identity)
            .field("token", &"<redacted>")
            .field("expires_in_secs", &self.expires_in_secs)
            .finish()
    }
}

pub struct MeetingService {
    codes: CodeStore,
    random: Arc<dyn RandomSource>,
    issuer: Arc<dyn TokenIssuer>,
}

impl MeetingService {
    pub fn new(codes: CodeStore, random: Arc<dyn RandomSource>, issuer: Arc<dyn TokenIssuer>) -> Self {
        Self { codes, random, issuer }
    }

    pub fn create_meeting(&self, now: Instant) -> Result<RoomCode, MeetingError> {
        for _ in 0..MAX_CODE_ATTEMPTS {
            let code = RoomCode::generate(|buf| self.random.fill(buf))?;
            match self.codes.insert(code.clone(), now) {
                Ok(()) => return Ok(code),
                Err(StoreError::Duplicate) => continue,
                Err(StoreError::Full) => return Err(MeetingError::CapacityExceeded),
            }
        }
        Err(MeetingError::CapacityExceeded)
    }

    /// Issues a token only for a code that is stored and unexpired. Any other input,
    /// well-formed or not, is `NotFound`; nothing is signed for it.
    pub fn issue_token(&self, code: &str, name: &str, now: Instant) -> Result<TokenGrant, MeetingError> {
        let name = DisplayName::parse(name)?;
        let room = RoomCode::parse(code)
            .filter(|room| self.codes.is_live(room, now))
            .ok_or(MeetingError::NotFound)?;
        let mut suffix = [0u8; IDENTITY_SUFFIX_BYTES];
        self.random.fill(&mut suffix)?;
        let identity = participant_identity(&name, &suffix);
        let issued = self.issuer.issue(&TokenRequest { room: &room, identity: &identity, name: &name })?;
        Ok(TokenGrant { room, identity, token: issued.token, expires_in_secs: issued.expires_in_secs })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::IssuedToken;
    use std::sync::Mutex;
    use std::time::Duration;

    struct CountingRandom(Mutex<u8>);

    impl RandomSource for CountingRandom {
        fn fill(&self, dest: &mut [u8]) -> Result<(), RandomError> {
            let mut next = self.0.lock().unwrap();
            for b in dest.iter_mut() {
                *b = *next % 252;
                *next = next.wrapping_add(1);
            }
            Ok(())
        }
    }

    /// Records the room it was asked to sign for; returns a fixed fake token.
    #[derive(Default)]
    struct RecordingIssuer(Mutex<Vec<String>>);

    impl TokenIssuer for RecordingIssuer {
        fn issue(&self, request: &TokenRequest<'_>) -> Result<IssuedToken, IssueError> {
            self.0.lock().unwrap().push(request.room.as_str().to_owned());
            Ok(IssuedToken { token: "fake.jwt.value".to_owned(), expires_in_secs: 600 })
        }
    }

    fn service(capacity: usize) -> (MeetingService, Arc<RecordingIssuer>) {
        let issuer = Arc::new(RecordingIssuer::default());
        let service = MeetingService::new(
            CodeStore::new(Duration::from_secs(3600), capacity),
            Arc::new(CountingRandom(Mutex::new(0))),
            issuer.clone(),
        );
        (service, issuer)
    }

    #[test]
    fn a_token_is_issued_for_a_generated_code_and_names_that_room() {
        let (service, issuer) = service(10);
        let now = Instant::now();
        let code = service.create_meeting(now).unwrap();
        let grant = service.issue_token(code.as_str(), "Guest A", now).unwrap();
        assert_eq!(grant.room, code);
        assert!(grant.identity.starts_with("guest-a-"));
        assert_eq!(issuer.0.lock().unwrap().as_slice(), [code.as_str().to_owned()]);
    }

    #[test]
    fn a_client_chosen_room_is_not_found_and_nothing_is_signed() {
        let (service, issuer) = service(10);
        let now = Instant::now();
        for room in ["km-zzz-zzz", "standup", ""] {
            assert!(matches!(service.issue_token(room, "Guest A", now), Err(MeetingError::NotFound)));
        }
        assert!(issuer.0.lock().unwrap().is_empty());
    }

    #[test]
    fn an_expired_code_is_not_found() {
        let (service, _) = service(10);
        let now = Instant::now();
        let code = service.create_meeting(now).unwrap();
        let later = now + Duration::from_secs(3600);
        assert!(matches!(service.issue_token(code.as_str(), "A", later), Err(MeetingError::NotFound)));
    }

    #[test]
    fn an_invalid_name_is_refused_before_signing() {
        let (service, issuer) = service(10);
        let now = Instant::now();
        let code = service.create_meeting(now).unwrap();
        assert!(matches!(service.issue_token(code.as_str(), "  ", now), Err(MeetingError::InvalidName(_))));
        assert!(issuer.0.lock().unwrap().is_empty());
    }

    #[test]
    fn a_full_store_reports_capacity_exceeded() {
        let (service, _) = service(1);
        let now = Instant::now();
        service.create_meeting(now).unwrap();
        assert!(matches!(service.create_meeting(now), Err(MeetingError::CapacityExceeded)));
    }

    #[test]
    fn the_token_is_redacted_from_debug_output() {
        let grant = TokenGrant {
            room: RoomCode::parse("km-abc-def").unwrap(),
            identity: "a-00".to_owned(),
            token: "fake.jwt.value".to_owned(),
            expires_in_secs: 600,
        };
        assert!(!format!("{grant:?}").contains("fake.jwt.value"));
    }
}
