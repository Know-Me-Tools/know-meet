//! The error envelope: `{ ok: false, error: { code, message } }`.

use std::time::Duration;

use axum::Json;
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use thiserror::Error;

use crate::application::MeetingError;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum ApiError {
    #[error("{0}")]
    InvalidRequest(&'static str),
    #[error("Requests must come from the Know Meet site.")]
    ForbiddenOrigin,
    #[error("No meeting has that code.")]
    MeetingNotFound,
    #[error("Too many requests. Try again shortly.")]
    RateLimited { retry_after_secs: u64 },
    #[error("No new meetings can start right now. Try again later.")]
    CapacityExceeded,
    #[error("The request took too long.")]
    Timeout,
    #[error("Something went wrong on our side.")]
    Internal,
}

impl ApiError {
    /// `Retry-After` is whole seconds, rounded up, at least 1.
    pub fn rate_limited(retry_after: Duration) -> Self {
        let mut secs = retry_after.as_secs();
        if retry_after.subsec_nanos() > 0 {
            secs += 1;
        }
        Self::RateLimited { retry_after_secs: secs.max(1) }
    }

    pub fn status(&self) -> StatusCode {
        match self {
            Self::InvalidRequest(_) => StatusCode::BAD_REQUEST,
            Self::ForbiddenOrigin => StatusCode::FORBIDDEN,
            Self::MeetingNotFound => StatusCode::NOT_FOUND,
            Self::RateLimited { .. } => StatusCode::TOO_MANY_REQUESTS,
            Self::CapacityExceeded => StatusCode::SERVICE_UNAVAILABLE,
            Self::Timeout => StatusCode::REQUEST_TIMEOUT,
            Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidRequest(_) => "invalid-request",
            Self::ForbiddenOrigin => "forbidden-origin",
            Self::MeetingNotFound => "meeting-not-found",
            Self::RateLimited { .. } => "rate-limited",
            Self::CapacityExceeded => "capacity-exceeded",
            Self::Timeout => "request-timeout",
            Self::Internal => "internal-error",
        }
    }
}

pub const NAME_MESSAGE: &str = "Enter a name of 1 to 60 characters.";

impl From<MeetingError> for ApiError {
    fn from(error: MeetingError) -> Self {
        match error {
            MeetingError::InvalidName(_) => Self::InvalidRequest(NAME_MESSAGE),
            MeetingError::NotFound => Self::MeetingNotFound,
            MeetingError::CapacityExceeded => Self::CapacityExceeded,
            // Both are logged where they occur, without key material.
            MeetingError::Random(_) | MeetingError::Issue(_) => Self::Internal,
        }
    }
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    ok: bool,
    error: ErrorDetail<'a>,
}

#[derive(Serialize)]
struct ErrorDetail<'a> {
    code: &'a str,
    message: String,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = ErrorBody { ok: false, error: ErrorDetail { code: self.code(), message: self.to_string() } };
        let mut response = (self.status(), Json(body)).into_response();
        if let Self::RateLimited { retry_after_secs } = self {
            response.headers_mut().insert(header::RETRY_AFTER, HeaderValue::from(retry_after_secs));
        }
        response
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_after_rounds_up_to_whole_seconds() {
        assert_eq!(ApiError::rate_limited(Duration::from_millis(1)), ApiError::RateLimited { retry_after_secs: 1 });
        assert_eq!(ApiError::rate_limited(Duration::from_millis(2500)), ApiError::RateLimited { retry_after_secs: 3 });
        assert_eq!(ApiError::rate_limited(Duration::ZERO), ApiError::RateLimited { retry_after_secs: 1 });
    }

    #[test]
    fn contract_codes_and_statuses() {
        assert_eq!((ApiError::InvalidRequest("x").status().as_u16(), ApiError::InvalidRequest("x").code()), (400, "invalid-request"));
        assert_eq!((ApiError::ForbiddenOrigin.status().as_u16(), ApiError::ForbiddenOrigin.code()), (403, "forbidden-origin"));
        assert_eq!((ApiError::MeetingNotFound.status().as_u16(), ApiError::MeetingNotFound.code()), (404, "meeting-not-found"));
        let limited = ApiError::RateLimited { retry_after_secs: 5 };
        assert_eq!((limited.status().as_u16(), limited.code()), (429, "rate-limited"));
    }
}
