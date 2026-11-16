//! Token bucket arithmetic. A full bucket holds `burst` requests; an empty bucket
//! refills completely in `refill` (so the steady rate is `burst / refill`).

use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BucketPolicy {
    capacity: f64,
    refill_per_sec: f64,
    full_refill: Duration,
}

impl BucketPolicy {
    /// `burst` must be at least 1 and `refill` non-zero; config enforces both.
    pub fn new(burst: u32, refill: Duration) -> Self {
        let capacity = f64::from(burst.max(1));
        let secs = refill.as_secs_f64().max(f64::EPSILON);
        Self { capacity, refill_per_sec: capacity / secs, full_refill: refill }
    }

    pub fn full_refill(&self) -> Duration {
        self.full_refill
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Allowed,
    Limited { retry_after: Duration },
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Bucket {
    tokens: f64,
    updated: Instant,
}

impl Bucket {
    pub fn full(policy: &BucketPolicy, now: Instant) -> Self {
        Self { tokens: policy.capacity, updated: now }
    }

    /// Refills for the time elapsed since the last call, then takes one token.
    pub fn take(&mut self, policy: &BucketPolicy, now: Instant) -> Decision {
        self.refill(policy, now);
        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            return Decision::Allowed;
        }
        let wait_secs = (1.0 - self.tokens) / policy.refill_per_sec;
        Decision::Limited { retry_after: Duration::from_secs_f64(wait_secs.max(0.0)) }
    }

    /// A bucket that would be full again is equivalent to no bucket; it can be dropped.
    pub fn is_full_at(&self, policy: &BucketPolicy, now: Instant) -> bool {
        now.saturating_duration_since(self.updated) >= policy.full_refill
    }

    fn refill(&mut self, policy: &BucketPolicy, now: Instant) {
        let elapsed = now.saturating_duration_since(self.updated).as_secs_f64();
        self.tokens = (self.tokens + elapsed * policy.refill_per_sec).min(policy.capacity);
        self.updated = self.updated.max(now);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_exactly_the_burst_then_limits() {
        let policy = BucketPolicy::new(3, Duration::from_secs(30));
        let now = Instant::now();
        let mut bucket = Bucket::full(&policy, now);
        for _ in 0..3 {
            assert_eq!(bucket.take(&policy, now), Decision::Allowed);
        }
        match bucket.take(&policy, now) {
            Decision::Limited { retry_after } => {
                let secs = retry_after.as_secs_f64();
                assert!((9.99..=10.01).contains(&secs), "retry after {secs}s");
            }
            Decision::Allowed => panic!("fourth request must be limited"),
        }
    }

    #[test]
    fn refills_completely_after_the_refill_period() {
        let policy = BucketPolicy::new(2, Duration::from_secs(10));
        let start = Instant::now();
        let mut bucket = Bucket::full(&policy, start);
        bucket.take(&policy, start);
        bucket.take(&policy, start);
        let later = start + Duration::from_secs(10);
        assert!(bucket.is_full_at(&policy, later));
        assert_eq!(bucket.take(&policy, later), Decision::Allowed);
        assert_eq!(bucket.take(&policy, later), Decision::Allowed);
        assert!(matches!(bucket.take(&policy, later), Decision::Limited { .. }));
    }

    #[test]
    fn partial_refill_grants_one_token_per_interval() {
        let policy = BucketPolicy::new(4, Duration::from_secs(8));
        let start = Instant::now();
        let mut bucket = Bucket::full(&policy, start);
        for _ in 0..4 {
            bucket.take(&policy, start);
        }
        let two_secs = start + Duration::from_secs(2);
        assert_eq!(bucket.take(&policy, two_secs), Decision::Allowed);
        assert!(matches!(bucket.take(&policy, two_secs), Decision::Limited { .. }));
    }
}
