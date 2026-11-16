use std::collections::HashMap;

use super::*;

const FAKE_SECRET: &str = "fake-secret-value-for-config-tests";
const FAKE_KEY: &str = "APIfakeconfigkey";

fn base() -> HashMap<&'static str, String> {
    HashMap::from([
        (env::LIVEKIT_URL, "wss://example.livekit.invalid".to_owned()),
        (env::LIVEKIT_API_KEY, FAKE_KEY.to_owned()),
        (env::LIVEKIT_API_SECRET, FAKE_SECRET.to_owned()),
        (env::SITE_ORIGIN, "https://meet.example.test".to_owned()),
        (env::TRUSTED_PROXY_HOPS, "1".to_owned()),
    ])
}

fn load(vars: &HashMap<&'static str, String>) -> Result<Config, ConfigError> {
    Config::from_lookup(&|name: &str| vars.get(name).cloned())
}

#[test]
fn loads_with_defaults() {
    let config = load(&base()).unwrap();
    assert_eq!(config.site_origin, "https://meet.example.test");
    assert_eq!(config.trusted_proxy_hops, 1);
    assert_eq!(config.token_ttl, Duration::from_secs(600));
    assert_eq!(config.rate_limit, RateLimitConfig { burst: 10, refill: Duration::from_secs(60) });
    assert_eq!(config.bind_addr, "0.0.0.0:8080".parse().unwrap());
}

#[test]
fn meeting_creation_defaults_are_strict() {
    let config = load(&base()).unwrap();
    assert_eq!(config.meeting_rate_limit, RateLimitConfig { burst: 3, refill: Duration::from_secs(600) });
    assert_eq!(config.unused_code_ttl, Duration::from_secs(900));
    assert_eq!(config.code_ttl, Duration::from_secs(86_400));
    assert_eq!(config.max_codes_per_client, 5);
    assert_eq!(config.max_used_codes_per_client, 50);
    assert_eq!(config.max_stored_codes, 100_000);
}

#[test]
fn an_unused_code_lifetime_above_the_code_lifetime_is_refused() {
    let mut vars = base();
    vars.insert(env::CODE_TTL_SECONDS, "600".to_owned());
    vars.insert(env::UNUSED_CODE_TTL_SECONDS, "601".to_owned());
    let error = load(&vars).unwrap_err();
    assert!(matches!(error, ConfigError::Invalid { name, .. } if name == env::UNUSED_CODE_TTL_SECONDS));
    assert!(!error.to_string().contains("601"), "{error}");
    vars.insert(env::UNUSED_CODE_TTL_SECONDS, "600".to_owned());
    assert_eq!(load(&vars).unwrap().unused_code_ttl, Duration::from_secs(600));
}

#[test]
fn the_new_meeting_limits_are_bounded() {
    for (name, bad) in [
        (env::MEETING_RATE_LIMIT_BURST, "0"),
        (env::MEETING_RATE_LIMIT_REFILL_SECONDS, "0"),
        (env::UNUSED_CODE_TTL_SECONDS, "59"),
        (env::MAX_CODES_PER_CLIENT, "0"),
        (env::MAX_CODES_PER_CLIENT, "10001"),
        (env::MAX_USED_CODES_PER_CLIENT, "0"),
        (env::MAX_USED_CODES_PER_CLIENT, "10001"),
    ] {
        let mut vars = base();
        vars.insert(name, bad.to_owned());
        assert!(matches!(load(&vars), Err(ConfigError::Invalid { name: n, .. }) if n == name), "{name}={bad}");
    }
}

#[test]
fn each_missing_required_variable_is_named_without_any_value() {
    for name in [
        env::LIVEKIT_URL,
        env::LIVEKIT_API_KEY,
        env::LIVEKIT_API_SECRET,
        env::SITE_ORIGIN,
        env::TRUSTED_PROXY_HOPS,
    ] {
        let mut vars = base();
        vars.remove(name);
        let error = load(&vars).unwrap_err();
        assert_eq!(error, ConfigError::Missing { name });
        let message = error.to_string();
        assert!(message.contains(name), "{message}");
        assert!(!message.contains(FAKE_SECRET) && !message.contains(FAKE_KEY), "{message}");
    }
}

#[test]
fn a_blank_variable_counts_as_missing() {
    let mut vars = base();
    vars.insert(env::LIVEKIT_API_SECRET, "  \n".to_owned());
    assert_eq!(load(&vars).unwrap_err(), ConfigError::Missing { name: env::LIVEKIT_API_SECRET });
}

#[test]
fn a_token_lifetime_above_the_hard_bound_is_refused() {
    let mut vars = base();
    vars.insert(env::TOKEN_TTL_SECONDS, (MAX_TOKEN_TTL_SECONDS + 1).to_string());
    let error = load(&vars).unwrap_err();
    assert!(matches!(error, ConfigError::Invalid { name, .. } if name == env::TOKEN_TTL_SECONDS));
    vars.insert(env::TOKEN_TTL_SECONDS, MAX_TOKEN_TTL_SECONDS.to_string());
    assert_eq!(load(&vars).unwrap().token_ttl, Duration::from_secs(MAX_TOKEN_TTL_SECONDS));
}

#[test]
fn invalid_values_are_reported_without_echoing_them() {
    let mut vars = base();
    vars.insert(env::RATE_LIMIT_BURST, "lots-and-lots".to_owned());
    let message = load(&vars).unwrap_err().to_string();
    assert!(message.contains(env::RATE_LIMIT_BURST) && !message.contains("lots-and-lots"), "{message}");
}

#[test]
fn the_livekit_url_must_be_wss() {
    let mut vars = base();
    vars.insert(env::LIVEKIT_URL, "https://example.livekit.invalid".to_owned());
    assert!(matches!(load(&vars), Err(ConfigError::Invalid { name, .. }) if name == env::LIVEKIT_URL));
}

#[test]
fn the_site_origin_must_be_a_bare_origin() {
    for bad in ["meet.example.test", "https://meet.example.test/", "https://a@meet.example.test", "https://"] {
        let mut vars = base();
        vars.insert(env::SITE_ORIGIN, bad.to_owned());
        assert!(load(&vars).is_err(), "{bad:?} should be refused");
    }
    let mut vars = base();
    vars.insert(env::SITE_ORIGIN, "HTTP://Localhost:8080".to_owned());
    assert_eq!(load(&vars).unwrap().site_origin, "http://localhost:8080");
}

#[test]
fn trusted_hops_are_bounded() {
    let mut vars = base();
    vars.insert(env::TRUSTED_PROXY_HOPS, (MAX_TRUSTED_PROXY_HOPS + 1).to_string());
    assert!(load(&vars).is_err());
    vars.insert(env::TRUSTED_PROXY_HOPS, "0".to_owned());
    assert_eq!(load(&vars).unwrap().trusted_proxy_hops, 0);
}

#[test]
fn debug_output_never_contains_the_key_or_secret() {
    let text = format!("{:?}", load(&base()).unwrap());
    assert!(!text.contains(FAKE_SECRET) && !text.contains(FAKE_KEY), "{text}");
}
