//! Which address a request is charged to.
//!
//! Each trusted proxy in front of the service appends the address it received the
//! connection from to `X-Forwarded-For`. Anything to the left of those entries was
//! written by the client and can be forged, so it is ignored. With `trusted_hops = N`
//! the client address is the N-th entry from the right. With `N = 0` the TCP peer
//! address is used and the header is ignored entirely.
//!
//! If the header has fewer than N entries, or that entry does not parse, the peer
//! address is used. Behind the Gateway that peer is the Gateway itself, so such
//! requests share one bucket: a misconfigured chain fails closed, it never lets a
//! client pick its own bucket.

use std::net::{IpAddr, SocketAddr};

use axum::http::HeaderMap;

const X_FORWARDED_FOR: &str = "x-forwarded-for";

pub fn client_address(headers: &HeaderMap, peer: Option<IpAddr>, trusted_hops: usize) -> Option<IpAddr> {
    if trusted_hops == 0 {
        return peer;
    }
    // Lossy decoding keeps every comma in place, so a client cannot shift the
    // trusted entries by sending bytes that are not valid UTF-8.
    let lines: Vec<String> = headers
        .get_all(X_FORWARDED_FOR)
        .iter()
        .map(|value| String::from_utf8_lossy(value.as_bytes()).into_owned())
        .collect();
    let entries: Vec<&str> = lines.iter().flat_map(|line| line.split(',')).map(str::trim).collect();
    let Some(index) = entries.len().checked_sub(trusted_hops) else {
        tracing::warn!(event = "forwarded_chain_too_short", entries = entries.len(), trusted_hops);
        return peer;
    };
    match parse_entry(entries[index]) {
        Some(ip) => Some(ip),
        None => {
            tracing::warn!(event = "forwarded_entry_unparseable", trusted_hops);
            peer
        }
    }
}

/// Accepts `1.2.3.4`, `2001:db8::1`, `1.2.3.4:5678` and `[2001:db8::1]:5678`.
fn parse_entry(entry: &str) -> Option<IpAddr> {
    entry
        .parse::<IpAddr>()
        .ok()
        .or_else(|| entry.parse::<SocketAddr>().ok().map(|addr| addr.ip()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    const GATEWAY: &str = "10.0.0.5";

    fn headers(lines: &[&str]) -> HeaderMap {
        let mut map = HeaderMap::new();
        for line in lines {
            map.append(X_FORWARDED_FOR, HeaderValue::from_str(line).unwrap());
        }
        map
    }

    fn ip(raw: &str) -> IpAddr {
        raw.parse().unwrap()
    }

    fn peer() -> Option<IpAddr> {
        Some(ip(GATEWAY))
    }

    #[test]
    fn one_trusted_hop_takes_the_rightmost_entry_not_the_forged_leftmost() {
        let map = headers(&["6.6.6.6, 1.1.1.1, 203.0.113.7"]);
        assert_eq!(client_address(&map, peer(), 1), Some(ip("203.0.113.7")));
    }

    #[test]
    fn two_trusted_hops_take_the_second_entry_from_the_right() {
        let map = headers(&["6.6.6.6, 203.0.113.7, 10.1.1.1"]);
        assert_eq!(client_address(&map, peer(), 2), Some(ip("203.0.113.7")));
    }

    #[test]
    fn multiple_header_lines_are_one_list_in_order() {
        let map = headers(&["6.6.6.6", "203.0.113.7"]);
        assert_eq!(client_address(&map, peer(), 1), Some(ip("203.0.113.7")));
    }

    #[test]
    fn zero_hops_ignores_the_header() {
        let map = headers(&["203.0.113.7"]);
        assert_eq!(client_address(&map, peer(), 0), peer());
    }

    #[test]
    fn a_short_chain_or_bad_entry_falls_back_to_the_peer() {
        assert_eq!(client_address(&HeaderMap::new(), peer(), 1), peer());
        assert_eq!(client_address(&headers(&["203.0.113.7"]), peer(), 2), peer());
        assert_eq!(client_address(&headers(&["203.0.113.7, not-an-ip"]), peer(), 1), peer());
    }

    #[test]
    fn ports_and_ipv6_entries_parse() {
        assert_eq!(client_address(&headers(&["203.0.113.7:4711"]), peer(), 1), Some(ip("203.0.113.7")));
        assert_eq!(client_address(&headers(&["[2001:db8::1]:443"]), peer(), 1), Some(ip("2001:db8::1")));
        assert_eq!(client_address(&headers(&["2001:db8::1"]), peer(), 1), Some(ip("2001:db8::1")));
    }

    #[test]
    fn invalid_utf8_in_the_forged_part_does_not_shift_entries() {
        let mut map = HeaderMap::new();
        map.append(X_FORWARDED_FOR, HeaderValue::from_bytes(b"\xff\xfe, 203.0.113.7").unwrap());
        assert_eq!(client_address(&map, peer(), 1), Some(ip("203.0.113.7")));
    }
}
