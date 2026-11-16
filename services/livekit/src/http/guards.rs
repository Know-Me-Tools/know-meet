//! Request checks shared by the POST endpoints.
//!
//! The `Origin` check stops other websites from driving a visitor's browser against
//! this API. It is not authentication: non-browser clients can send any `Origin`,
//! which is why the rate limit applies to every request that passes it.

use axum::http::{HeaderMap, header};

/// Exactly one `Origin` header, equal (ASCII case-insensitive) to the site origin.
/// A missing header, `null`, or several headers are refused.
pub fn origin_allowed(headers: &HeaderMap, site_origin: &str) -> bool {
    let mut values = headers.get_all(header::ORIGIN).iter();
    match (values.next(), values.next()) {
        (Some(value), None) => value.to_str().is_ok_and(|origin| origin.eq_ignore_ascii_case(site_origin)),
        _ => false,
    }
}

/// `Content-Type: application/json`, parameters such as `charset` allowed. Requiring it
/// also means a cross-site browser request must pass a CORS preflight, which this
/// service never grants.
pub fn is_json(headers: &HeaderMap) -> bool {
    headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .is_some_and(|mime| mime.trim().eq_ignore_ascii_case("application/json"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    const SITE: &str = "https://meet.example.test";

    fn with(name: header::HeaderName, values: &[&str]) -> HeaderMap {
        let mut map = HeaderMap::new();
        for value in values {
            map.append(name.clone(), HeaderValue::from_str(value).unwrap());
        }
        map
    }

    #[test]
    fn only_the_exact_site_origin_passes() {
        assert!(origin_allowed(&with(header::ORIGIN, &[SITE]), SITE));
        assert!(origin_allowed(&with(header::ORIGIN, &["HTTPS://MEET.EXAMPLE.TEST"]), SITE));
        for bad in ["https://attacker.example", "null", "https://meet.example.test.attacker.example", "http://meet.example.test"] {
            assert!(!origin_allowed(&with(header::ORIGIN, &[bad]), SITE), "{bad}");
        }
    }

    #[test]
    fn a_missing_or_repeated_origin_is_refused() {
        assert!(!origin_allowed(&HeaderMap::new(), SITE));
        assert!(!origin_allowed(&with(header::ORIGIN, &[SITE, SITE]), SITE));
    }

    #[test]
    fn json_content_type_is_required() {
        assert!(is_json(&with(header::CONTENT_TYPE, &["application/json"])));
        assert!(is_json(&with(header::CONTENT_TYPE, &["application/json; charset=utf-8"])));
        assert!(!is_json(&with(header::CONTENT_TYPE, &["text/plain"])));
        assert!(!is_json(&HeaderMap::new()));
    }
}
