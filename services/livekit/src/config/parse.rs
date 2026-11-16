//! Parsing helpers. No message ever includes the value that was read.

use std::net::SocketAddr;

use super::ConfigError;

pub type Lookup<'a> = &'a dyn Fn(&str) -> Option<String>;

fn invalid(name: &'static str, reason: impl Into<String>) -> ConfigError {
    ConfigError::Invalid { name, reason: reason.into() }
}

/// Unset and blank are both missing. Surrounding whitespace (for example a trailing
/// newline from a mounted Secret) is removed.
fn read(lookup: Lookup<'_>, name: &'static str) -> Option<String> {
    lookup(name).map(|value| value.trim().to_owned()).filter(|value| !value.is_empty())
}

pub fn required(lookup: Lookup<'_>, name: &'static str) -> Result<String, ConfigError> {
    read(lookup, name).ok_or(ConfigError::Missing { name })
}

fn in_range(name: &'static str, raw: &str, min: u64, max: u64) -> Result<u64, ConfigError> {
    let value: u64 = raw.parse().map_err(|_| invalid(name, "must be a whole number"))?;
    if (min..=max).contains(&value) {
        Ok(value)
    } else {
        Err(invalid(name, format!("must be between {min} and {max}")))
    }
}

/// A required whole number in `min..=max`.
pub fn bounded(lookup: Lookup<'_>, name: &'static str, min: u64, max: u64) -> Result<u64, ConfigError> {
    in_range(name, &required(lookup, name)?, min, max)
}

/// An optional whole number in `min..=max`, `default` when unset.
pub fn optional_bounded(
    lookup: Lookup<'_>,
    name: &'static str,
    default: u64,
    min: u64,
    max: u64,
) -> Result<u64, ConfigError> {
    match read(lookup, name) {
        Some(raw) => in_range(name, &raw, min, max),
        None => Ok(default),
    }
}

pub fn livekit_url(lookup: Lookup<'_>, name: &'static str) -> Result<String, ConfigError> {
    let url = required(lookup, name)?;
    let host = url.strip_prefix("wss://").ok_or_else(|| invalid(name, "must start with wss://"))?;
    if host.is_empty() || host.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err(invalid(name, "must be a wss:// URL with a host"));
    }
    Ok(url)
}

/// `https://host[:port]` or `http://host[:port]`, no path, query, fragment or userinfo.
pub fn site_origin(lookup: Lookup<'_>, name: &'static str) -> Result<String, ConfigError> {
    let origin = required(lookup, name)?.to_ascii_lowercase();
    let authority = origin
        .strip_prefix("https://")
        .or_else(|| origin.strip_prefix("http://"))
        .ok_or_else(|| invalid(name, "must start with https:// or http://"))?;
    let bad = |c: char| matches!(c, '/' | '?' | '#' | '@') || c.is_whitespace() || c.is_control();
    if authority.is_empty() || authority.chars().any(bad) {
        return Err(invalid(name, "must be scheme://host[:port] with no path or trailing slash"));
    }
    Ok(origin)
}

pub fn bind_addr(lookup: Lookup<'_>, name: &'static str, default: &str) -> Result<SocketAddr, ConfigError> {
    let raw = read(lookup, name).unwrap_or_else(|| default.to_owned());
    raw.parse().map_err(|_| invalid(name, "must be an address such as 0.0.0.0:8080"))
}
