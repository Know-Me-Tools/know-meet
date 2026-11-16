//! Configuration from the environment only. Errors name the variable, never its value.

mod parse;
mod secret;

use std::net::SocketAddr;
use std::time::Duration;

use thiserror::Error;

pub use secret::SecretString;

use crate::infrastructure::RoomLimits;
use parse::{Lookup, bind_addr, bounded, livekit_url, optional_bounded, required, site_origin};

/// Environment variable names.
pub mod env {
    pub const LIVEKIT_URL: &str = "LIVEKIT_URL";
    pub const LIVEKIT_API_KEY: &str = "LIVEKIT_API_KEY";
    pub const LIVEKIT_API_SECRET: &str = "LIVEKIT_API_SECRET";
    pub const SITE_ORIGIN: &str = "KM_SITE_ORIGIN";
    pub const TRUSTED_PROXY_HOPS: &str = "KM_TRUSTED_PROXY_HOPS";
    pub const BIND_ADDR: &str = "KM_BIND_ADDR";
    pub const TOKEN_TTL_SECONDS: &str = "KM_TOKEN_TTL_SECONDS";
    pub const RATE_LIMIT_BURST: &str = "KM_RATE_LIMIT_BURST";
    pub const RATE_LIMIT_REFILL_SECONDS: &str = "KM_RATE_LIMIT_REFILL_SECONDS";
    pub const CODE_TTL_SECONDS: &str = "KM_CODE_TTL_SECONDS";
    pub const MAX_STORED_CODES: &str = "KM_MAX_STORED_CODES";
    pub const MEETING_RATE_LIMIT_BURST: &str = "KM_MEETING_RATE_LIMIT_BURST";
    pub const MEETING_RATE_LIMIT_REFILL_SECONDS: &str = "KM_MEETING_RATE_LIMIT_REFILL_SECONDS";
    pub const UNUSED_CODE_TTL_SECONDS: &str = "KM_UNUSED_CODE_TTL_SECONDS";
    pub const MAX_CODES_PER_CLIENT: &str = "KM_MAX_CODES_PER_CLIENT";
    pub const MAX_USED_CODES_PER_CLIENT: &str = "KM_MAX_USED_CODES_PER_CLIENT";
    pub const REQUEST_TIMEOUT_SECONDS: &str = "KM_REQUEST_TIMEOUT_SECONDS";
    pub const ROOM_MAX_PARTICIPANTS: &str = "KM_ROOM_MAX_PARTICIPANTS";
    pub const ROOM_EMPTY_TIMEOUT_SECONDS: &str = "KM_ROOM_EMPTY_TIMEOUT_SECONDS";
}

/// Hard upper bound on token lifetime. Configuration above it is refused at startup.
pub const MAX_TOKEN_TTL_SECONDS: u64 = 3600;
pub const MIN_TOKEN_TTL_SECONDS: u64 = 60;
pub const MAX_TRUSTED_PROXY_HOPS: u64 = 8;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum ConfigError {
    #[error("{name} is not set")]
    Missing { name: &'static str },
    #[error("{name} is invalid: {reason}")]
    Invalid { name: &'static str, reason: String },
}

#[derive(Debug)]
pub struct LiveKitConfig {
    /// Public `wss://` URL returned to clients. Not secret.
    pub url: String,
    pub api_key: SecretString,
    pub api_secret: SecretString,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RateLimitConfig {
    /// Requests one client may send back to back with a full bucket.
    pub burst: u32,
    /// Time for an empty bucket to refill completely.
    pub refill: Duration,
}

#[derive(Debug)]
pub struct Config {
    pub livekit: LiveKitConfig,
    /// Exact `scheme://host[:port]`, lowercase. POSTs need an equal `Origin`.
    pub site_origin: String,
    /// Proxies in front of the service that each append to `X-Forwarded-For`.
    pub trusted_proxy_hops: usize,
    pub bind_addr: SocketAddr,
    pub token_ttl: Duration,
    /// Shared by every POST endpoint.
    pub rate_limit: RateLimitConfig,
    /// A second, stricter bucket that only `POST /api/meetings` spends.
    pub meeting_rate_limit: RateLimitConfig,
    /// Lifetime of a code once a token has been issued for it, counted from creation.
    pub code_ttl: Duration,
    /// Lifetime of a code no token has been issued for yet. Never above `code_ttl`.
    pub unused_code_ttl: Duration,
    pub max_stored_codes: usize,
    /// Live codes no token was issued for that one client address may hold at once.
    pub max_codes_per_client: usize,
    /// Live codes a token was issued for that one client address may hold at once.
    pub max_used_codes_per_client: usize,
    pub request_timeout: Duration,
    pub room: RoomLimits,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        Self::from_lookup(&|name: &str| std::env::var(name).ok())
    }

    /// Reads every variable through `lookup`, so tests never touch the process environment.
    pub fn from_lookup(lookup: Lookup<'_>) -> Result<Self, ConfigError> {
        let livekit = LiveKitConfig {
            url: livekit_url(lookup, env::LIVEKIT_URL)?,
            api_key: SecretString::new(required(lookup, env::LIVEKIT_API_KEY)?),
            api_secret: SecretString::new(required(lookup, env::LIVEKIT_API_SECRET)?),
        };
        let site_origin = site_origin(lookup, env::SITE_ORIGIN)?;
        let trusted_proxy_hops = bounded(lookup, env::TRUSTED_PROXY_HOPS, 0, MAX_TRUSTED_PROXY_HOPS)?;
        let bind_addr = bind_addr(lookup, env::BIND_ADDR, "0.0.0.0:8080")?;
        let token_ttl = optional_bounded(lookup, env::TOKEN_TTL_SECONDS, 600, MIN_TOKEN_TTL_SECONDS, MAX_TOKEN_TTL_SECONDS)?;
        let burst = optional_bounded(lookup, env::RATE_LIMIT_BURST, 10, 1, 1000)?;
        let refill = optional_bounded(lookup, env::RATE_LIMIT_REFILL_SECONDS, 60, 1, 86_400)?;
        let meeting_burst = optional_bounded(lookup, env::MEETING_RATE_LIMIT_BURST, 3, 1, 1000)?;
        let meeting_refill = optional_bounded(lookup, env::MEETING_RATE_LIMIT_REFILL_SECONDS, 600, 1, 86_400)?;
        let code_ttl = optional_bounded(lookup, env::CODE_TTL_SECONDS, 86_400, 60, 604_800)?;
        let unused_code_ttl = optional_bounded(lookup, env::UNUSED_CODE_TTL_SECONDS, 900, 60, 86_400)?;
        if unused_code_ttl > code_ttl {
            return Err(ConfigError::Invalid {
                name: env::UNUSED_CODE_TTL_SECONDS,
                reason: format!("must not exceed {}", env::CODE_TTL_SECONDS),
            });
        }
        let max_stored_codes = optional_bounded(lookup, env::MAX_STORED_CODES, 100_000, 1, 1_000_000)?;
        let max_codes_per_client = optional_bounded(lookup, env::MAX_CODES_PER_CLIENT, 5, 1, 10_000)?;
        let max_used_codes_per_client = optional_bounded(lookup, env::MAX_USED_CODES_PER_CLIENT, 50, 1, 10_000)?;
        let request_timeout = optional_bounded(lookup, env::REQUEST_TIMEOUT_SECONDS, 10, 1, 60)?;
        let max_participants = optional_bounded(lookup, env::ROOM_MAX_PARTICIPANTS, 10, 2, 100)?;
        let empty_timeout = optional_bounded(lookup, env::ROOM_EMPTY_TIMEOUT_SECONDS, 300, 10, 86_400)?;

        Ok(Self {
            livekit,
            site_origin,
            trusted_proxy_hops: to_usize(trusted_proxy_hops),
            bind_addr,
            token_ttl: Duration::from_secs(token_ttl),
            rate_limit: RateLimitConfig { burst: to_u32(burst), refill: Duration::from_secs(refill) },
            meeting_rate_limit: RateLimitConfig {
                burst: to_u32(meeting_burst),
                refill: Duration::from_secs(meeting_refill),
            },
            code_ttl: Duration::from_secs(code_ttl),
            unused_code_ttl: Duration::from_secs(unused_code_ttl),
            max_stored_codes: to_usize(max_stored_codes),
            max_codes_per_client: to_usize(max_codes_per_client),
            max_used_codes_per_client: to_usize(max_used_codes_per_client),
            request_timeout: Duration::from_secs(request_timeout),
            room: RoomLimits {
                max_participants: to_u32(max_participants),
                empty_timeout_secs: to_u32(empty_timeout),
            },
        })
    }
}

/// Every caller passes a value already bounded far below `u32::MAX`.
fn to_u32(value: u64) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

/// Every caller passes a value already bounded far below `usize::MAX` on 32- and 64-bit targets.
fn to_usize(value: u64) -> usize {
    usize::try_from(value).unwrap_or(usize::MAX)
}

#[cfg(test)]
mod tests;
