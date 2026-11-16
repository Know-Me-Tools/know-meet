//! One token bucket per client address. The service holds two limiters: one shared by
//! every POST endpoint and a stricter one spent only by meeting creation.
//!
//! In memory, so the limit is per replica; the service runs as one replica.

use std::collections::HashMap;
use std::net::{IpAddr, Ipv6Addr};
use std::sync::{Mutex, MutexGuard, PoisonError};
use std::time::Instant;

use crate::domain::{Bucket, BucketPolicy, Decision};

#[derive(Debug)]
pub struct RateLimiter {
    policy: BucketPolicy,
    buckets: Mutex<HashMap<IpAddr, Bucket>>,
    max_tracked: usize,
}

impl RateLimiter {
    /// `max_tracked` bounds memory. When every tracked bucket is still refilling and the
    /// table is full, new clients are limited (fail closed) rather than growing the table.
    pub fn new(policy: BucketPolicy, max_tracked: usize) -> Self {
        Self { policy, buckets: Mutex::new(HashMap::new()), max_tracked: max_tracked.max(1) }
    }

    pub fn check(&self, client: IpAddr, now: Instant) -> Decision {
        let key = bucket_key(client);
        let policy = self.policy;
        let mut buckets = self.lock();
        if !buckets.contains_key(&key) && buckets.len() >= self.max_tracked {
            buckets.retain(|_, bucket| !bucket.is_full_at(&policy, now));
            if buckets.len() >= self.max_tracked {
                tracing::warn!(event = "rate_limit_table_full", tracked = buckets.len());
                return Decision::Limited { retry_after: policy.full_refill() };
            }
        }
        buckets.entry(key).or_insert_with(|| Bucket::full(&policy, now)).take(&policy, now)
    }

    /// Buckets hold plain data and are consistent after every critical section.
    fn lock(&self) -> MutexGuard<'_, HashMap<IpAddr, Bucket>> {
        self.buckets.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// IPv4 addresses key individually. IPv6 keys on the /64 prefix, because one client
/// normally controls a whole /64 and could otherwise rotate addresses within it.
pub fn bucket_key(client: IpAddr) -> IpAddr {
    match client {
        IpAddr::V4(_) => client,
        IpAddr::V6(v6) => match v6.to_ipv4_mapped() {
            Some(v4) => IpAddr::V4(v4),
            None => {
                let s = v6.segments();
                IpAddr::V6(Ipv6Addr::new(s[0], s[1], s[2], s[3], 0, 0, 0, 0))
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn limiter(burst: u32, max_tracked: usize) -> RateLimiter {
        RateLimiter::new(BucketPolicy::new(burst, Duration::from_secs(60)), max_tracked)
    }

    fn ip(raw: &str) -> IpAddr {
        raw.parse().unwrap()
    }

    #[test]
    fn clients_have_separate_buckets() {
        let limiter = limiter(1, 100);
        let now = Instant::now();
        assert_eq!(limiter.check(ip("203.0.113.1"), now), Decision::Allowed);
        assert!(matches!(limiter.check(ip("203.0.113.1"), now), Decision::Limited { .. }));
        assert_eq!(limiter.check(ip("203.0.113.2"), now), Decision::Allowed);
    }

    #[test]
    fn ipv6_addresses_in_one_slash_64_share_a_bucket() {
        let limiter = limiter(1, 100);
        let now = Instant::now();
        assert_eq!(limiter.check(ip("2001:db8:1:2::1"), now), Decision::Allowed);
        assert!(matches!(
            limiter.check(ip("2001:db8:1:2:ffff::9"), now),
            Decision::Limited { .. }
        ));
        assert_eq!(limiter.check(ip("2001:db8:1:3::1"), now), Decision::Allowed);
    }

    #[test]
    fn ipv4_mapped_ipv6_shares_the_ipv4_bucket() {
        assert_eq!(bucket_key(ip("::ffff:203.0.113.9")), ip("203.0.113.9"));
    }

    #[test]
    fn a_full_table_fails_closed_until_buckets_refill() {
        let limiter = limiter(1, 1);
        let now = Instant::now();
        assert_eq!(limiter.check(ip("203.0.113.1"), now), Decision::Allowed);
        assert!(matches!(limiter.check(ip("203.0.113.2"), now), Decision::Limited { .. }));
        let later = now + Duration::from_secs(60);
        assert_eq!(limiter.check(ip("203.0.113.2"), later), Decision::Allowed);
    }
}
