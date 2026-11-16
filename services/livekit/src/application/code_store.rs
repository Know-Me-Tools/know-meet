//! In-memory store of issued room codes. Single replica only: a restart drops every
//! live code, and a second replica would not know the first one's codes.

use std::collections::HashMap;
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
}

#[derive(Debug)]
pub struct CodeStore {
    codes: Mutex<HashMap<RoomCode, Instant>>,
    ttl: Duration,
    capacity: usize,
}

impl CodeStore {
    pub fn new(ttl: Duration, capacity: usize) -> Self {
        Self { codes: Mutex::new(HashMap::new()), ttl, capacity: capacity.max(1) }
    }

    /// Stores `code` until `now + ttl`. Expired entries are purged when the store is full.
    pub fn insert(&self, code: RoomCode, now: Instant) -> Result<(), StoreError> {
        let mut codes = self.lock();
        if codes.len() >= self.capacity {
            codes.retain(|_, expires| *expires > now);
        }
        if codes.get(&code).is_some_and(|expires| *expires > now) {
            return Err(StoreError::Duplicate);
        }
        if codes.len() >= self.capacity {
            return Err(StoreError::Full);
        }
        codes.insert(code, now + self.ttl);
        Ok(())
    }

    pub fn is_live(&self, code: &RoomCode, now: Instant) -> bool {
        self.lock().get(code).is_some_and(|expires| *expires > now)
    }

    /// The map holds plain data and every critical section leaves it consistent, so a
    /// panic elsewhere while holding the lock cannot corrupt it; recover the guard.
    fn lock(&self) -> MutexGuard<'_, HashMap<RoomCode, Instant>> {
        self.codes.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code(raw: &str) -> RoomCode {
        RoomCode::parse(raw).unwrap()
    }

    #[test]
    fn a_stored_code_is_live_until_it_expires() {
        let store = CodeStore::new(Duration::from_secs(60), 10);
        let now = Instant::now();
        store.insert(code("km-abc-def"), now).unwrap();
        assert!(store.is_live(&code("km-abc-def"), now + Duration::from_secs(59)));
        assert!(!store.is_live(&code("km-abc-def"), now + Duration::from_secs(60)));
        assert!(!store.is_live(&code("km-zzz-zzz"), now));
    }

    #[test]
    fn a_live_duplicate_is_refused() {
        let store = CodeStore::new(Duration::from_secs(60), 10);
        let now = Instant::now();
        store.insert(code("km-abc-def"), now).unwrap();
        assert_eq!(store.insert(code("km-abc-def"), now), Err(StoreError::Duplicate));
    }

    #[test]
    fn the_cap_holds_until_entries_expire() {
        let store = CodeStore::new(Duration::from_secs(60), 1);
        let now = Instant::now();
        store.insert(code("km-aaa-aaa"), now).unwrap();
        assert_eq!(store.insert(code("km-bbb-bbb"), now), Err(StoreError::Full));
        let later = now + Duration::from_secs(61);
        assert_eq!(store.insert(code("km-bbb-bbb"), later), Ok(()));
    }
}
