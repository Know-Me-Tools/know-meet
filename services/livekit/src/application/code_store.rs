//! In-memory store of issued room codes. Single replica only: a restart drops every
//! live code, and a second replica would not know the first one's codes.
//!
//! Abuse limits (security review H1): a code nobody has requested a token for expires
//! after the short `unused_ttl`; the first issued token extends it to `used_ttl` from
//! creation. Each client address (its rate-limit key) may hold at most `per_owner` live
//! codes. Expired codes are purged on every insert, before any limit is checked.

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::{Mutex, MutexGuard, PoisonError};
use std::time::{Duration, Instant};

use thiserror::Error;

use crate::domain::RoomCode;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum StoreError {
    #[error("the code store is full")]
    Full,
    #[error("the code is already live")]
    Duplicate,
    /// The owner already holds the maximum number of live codes. `retry_after` is the time
    /// until the owner's earliest code expires.
    #[error("the client holds too many live codes")]
    OwnerLimit { retry_after: Duration },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CodePolicy {
    /// Lifetime of a code no token has been issued for.
    pub unused_ttl: Duration,
    /// Lifetime, from creation, of a code a token has been issued for.
    pub used_ttl: Duration,
    /// Live codes across all clients.
    pub capacity: usize,
    /// Live codes per owner.
    pub per_owner: usize,
}

#[derive(Debug, Clone, Copy)]
struct Entry {
    owner: IpAddr,
    created: Instant,
    expires: Instant,
}

#[derive(Debug)]
pub struct CodeStore {
    codes: Mutex<HashMap<RoomCode, Entry>>,
    policy: CodePolicy,
}

impl CodeStore {
    pub fn new(policy: CodePolicy) -> Self {
        let policy = CodePolicy { capacity: policy.capacity.max(1), per_owner: policy.per_owner.max(1), ..policy };
        Self { codes: Mutex::new(HashMap::new()), policy }
    }

    /// Stores `code` for `owner` until `now + unused_ttl`.
    pub fn insert(&self, code: RoomCode, owner: IpAddr, now: Instant) -> Result<(), StoreError> {
        let mut codes = self.lock();
        codes.retain(|_, entry| entry.expires > now);
        if codes.contains_key(&code) {
            return Err(StoreError::Duplicate);
        }
        let mut owned = 0usize;
        let mut earliest: Option<Instant> = None;
        for entry in codes.values().filter(|entry| entry.owner == owner) {
            owned += 1;
            earliest = Some(earliest.map_or(entry.expires, |e| e.min(entry.expires)));
        }
        if owned >= self.policy.per_owner {
            let retry_after = earliest.map_or(Duration::ZERO, |e| e.saturating_duration_since(now));
            return Err(StoreError::OwnerLimit { retry_after });
        }
        if codes.len() >= self.policy.capacity {
            return Err(StoreError::Full);
        }
        codes.insert(code, Entry { owner, created: now, expires: now + self.policy.unused_ttl });
        Ok(())
    }

    pub fn is_live(&self, code: &RoomCode, now: Instant) -> bool {
        self.lock().get(code).is_some_and(|entry| entry.expires > now)
    }

    /// Records that a token was issued for a live `code`: it now expires `used_ttl` after
    /// creation. Never shortens a lifetime; does nothing for an unknown or expired code.
    pub fn mark_used(&self, code: &RoomCode, now: Instant) {
        if let Some(entry) = self.lock().get_mut(code).filter(|entry| entry.expires > now) {
            entry.expires = entry.expires.max(entry.created + self.policy.used_ttl);
        }
    }

    /// The map holds plain data and every critical section leaves it consistent, so a
    /// panic elsewhere while holding the lock cannot corrupt it; recover the guard.
    fn lock(&self) -> MutexGuard<'_, HashMap<RoomCode, Entry>> {
        self.codes.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const UNUSED: Duration = Duration::from_secs(60);
    const USED: Duration = Duration::from_secs(3600);

    fn code(raw: &str) -> RoomCode {
        RoomCode::parse(raw).unwrap()
    }

    fn ip(raw: &str) -> IpAddr {
        raw.parse().unwrap()
    }

    fn store(capacity: usize, per_owner: usize) -> CodeStore {
        CodeStore::new(CodePolicy { unused_ttl: UNUSED, used_ttl: USED, capacity, per_owner })
    }

    #[test]
    fn an_unused_code_expires_after_the_short_lifetime() {
        let store = store(10, 10);
        let now = Instant::now();
        store.insert(code("km-abc-def"), ip("203.0.113.1"), now).unwrap();
        assert!(store.is_live(&code("km-abc-def"), now + UNUSED - Duration::from_secs(1)));
        assert!(!store.is_live(&code("km-abc-def"), now + UNUSED));
        assert!(!store.is_live(&code("km-zzz-zzz"), now));
    }

    #[test]
    fn a_used_code_lives_for_the_long_lifetime_from_creation() {
        let store = store(10, 10);
        let now = Instant::now();
        store.insert(code("km-abc-def"), ip("203.0.113.1"), now).unwrap();
        store.mark_used(&code("km-abc-def"), now + Duration::from_secs(30));
        assert!(store.is_live(&code("km-abc-def"), now + USED - Duration::from_secs(1)));
        assert!(!store.is_live(&code("km-abc-def"), now + USED));
    }

    #[test]
    fn marking_an_expired_code_does_not_revive_it() {
        let store = store(10, 10);
        let now = Instant::now();
        store.insert(code("km-abc-def"), ip("203.0.113.1"), now).unwrap();
        store.mark_used(&code("km-abc-def"), now + UNUSED);
        assert!(!store.is_live(&code("km-abc-def"), now + UNUSED + Duration::from_secs(1)));
    }

    #[test]
    fn a_live_duplicate_is_refused() {
        let store = store(10, 10);
        let now = Instant::now();
        store.insert(code("km-abc-def"), ip("203.0.113.1"), now).unwrap();
        assert_eq!(store.insert(code("km-abc-def"), ip("203.0.113.2"), now), Err(StoreError::Duplicate));
    }

    #[test]
    fn one_owner_is_capped_while_others_still_create() {
        let store = store(10, 2);
        let now = Instant::now();
        let owner = ip("203.0.113.1");
        store.insert(code("km-aaa-aaa"), owner, now).unwrap();
        store.insert(code("km-bbb-bbb"), owner, now + Duration::from_secs(10)).unwrap();
        let refused = store.insert(code("km-ccc-ccc"), owner, now + Duration::from_secs(20));
        assert_eq!(refused, Err(StoreError::OwnerLimit { retry_after: Duration::from_secs(40) }));
        assert_eq!(store.insert(code("km-ddd-ddd"), ip("198.51.100.2"), now), Ok(()));
    }

    #[test]
    fn expired_codes_do_not_count_against_the_owner() {
        let store = store(10, 1);
        let now = Instant::now();
        let owner = ip("203.0.113.1");
        store.insert(code("km-aaa-aaa"), owner, now).unwrap();
        assert!(matches!(store.insert(code("km-bbb-bbb"), owner, now), Err(StoreError::OwnerLimit { .. })));
        assert_eq!(store.insert(code("km-bbb-bbb"), owner, now + UNUSED), Ok(()));
    }

    #[test]
    fn the_cap_holds_until_entries_expire() {
        let store = store(1, 10);
        let now = Instant::now();
        store.insert(code("km-aaa-aaa"), ip("203.0.113.1"), now).unwrap();
        assert_eq!(store.insert(code("km-bbb-bbb"), ip("198.51.100.2"), now), Err(StoreError::Full));
        assert_eq!(store.insert(code("km-bbb-bbb"), ip("198.51.100.2"), now + UNUSED), Ok(()));
    }

    #[test]
    fn expired_codes_are_purged_before_capacity_is_checked() {
        let store = store(2, 10);
        let now = Instant::now();
        store.insert(code("km-aaa-aaa"), ip("203.0.113.1"), now).unwrap();
        store.insert(code("km-bbb-bbb"), ip("203.0.113.2"), now + Duration::from_secs(30)).unwrap();
        // The first code has expired; the store is not full although two entries were held.
        assert_eq!(store.insert(code("km-ccc-ccc"), ip("203.0.113.3"), now + UNUSED), Ok(()));
        assert!(!store.is_live(&code("km-aaa-aaa"), now + UNUSED));
        assert!(store.is_live(&code("km-bbb-bbb"), now + UNUSED));
    }
}
