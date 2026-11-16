//! Ports implemented in `infrastructure`. Tests can substitute either one.

use std::fmt;

use thiserror::Error;

use crate::domain::{DisplayName, RoomCode};

#[derive(Debug, Error)]
#[error("the system random source failed")]
pub struct RandomError;

/// Cryptographically secure randomness.
pub trait RandomSource: Send + Sync {
    fn fill(&self, dest: &mut [u8]) -> Result<(), RandomError>;
}

#[derive(Debug, Error)]
#[error("the access token could not be signed")]
pub struct IssueError;

pub struct TokenRequest<'a> {
    pub room: &'a RoomCode,
    pub identity: &'a str,
    pub name: &'a DisplayName,
}

pub struct IssuedToken {
    pub token: String,
    pub expires_in_secs: u64,
}

impl fmt::Debug for IssuedToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("IssuedToken")
            .field("token", &"<redacted>")
            .field("expires_in_secs", &self.expires_in_secs)
            .finish()
    }
}

/// Signs a guest token that joins exactly `request.room`.
pub trait TokenIssuer: Send + Sync {
    fn issue(&self, request: &TokenRequest<'_>) -> Result<IssuedToken, IssueError>;
}
