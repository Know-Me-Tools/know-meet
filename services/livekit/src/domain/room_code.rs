//! Room codes: `km-xxx-xxx` over `[a-z0-9]`, generated only by this service.
//!
//! 36^6 (about 2.18 billion) codes. Guessing is bounded by the per-client rate
//! limit, not by the code space alone.

const PREFIX: &str = "km-";
const ALPHABET: &[u8; 36] = b"abcdefghijklmnopqrstuvwxyz0123456789";
const ALPHABET_LEN: u8 = 36;
/// Largest multiple of 36 that fits in a byte (7 * 36). Bytes at or above it are
/// discarded, so every symbol is equally likely (no modulo bias).
const UNBIASED_LIMIT: u8 = 252;
const GROUP_LEN: usize = 3;
const SYMBOLS: usize = 2 * GROUP_LEN;
/// `km-` (3) + group (3) + `-` (1) + group (3).
pub const CODE_LEN: usize = 10;
const RANDOM_CHUNK: usize = 16;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct RoomCode(String);

impl RoomCode {
    /// Generates a code from `fill`, which must be a CSPRNG in production.
    /// Uses rejection sampling: each accepted byte maps to one symbol uniformly.
    pub fn generate<E>(mut fill: impl FnMut(&mut [u8]) -> Result<(), E>) -> Result<Self, E> {
        let mut symbols = [0u8; SYMBOLS];
        let mut accepted = 0;
        let mut chunk = [0u8; RANDOM_CHUNK];
        while accepted < SYMBOLS {
            fill(&mut chunk)?;
            for &byte in &chunk {
                if accepted == SYMBOLS {
                    break;
                }
                if byte < UNBIASED_LIMIT {
                    symbols[accepted] = ALPHABET[usize::from(byte % ALPHABET_LEN)];
                    accepted += 1;
                }
            }
        }
        let mut code = String::with_capacity(CODE_LEN);
        code.push_str(PREFIX);
        code.extend(symbols[..GROUP_LEN].iter().map(|&b| char::from(b)));
        code.push('-');
        code.extend(symbols[GROUP_LEN..].iter().map(|&b| char::from(b)));
        Ok(Self(code))
    }

    /// Accepts only the exact `km-xxx-xxx` shape (lowercase). Anything else is not a code.
    pub fn parse(input: &str) -> Option<Self> {
        is_well_formed(input).then(|| Self(input.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

fn is_well_formed(input: &str) -> bool {
    let bytes = input.as_bytes();
    let symbol = |b: &u8| b.is_ascii_lowercase() || b.is_ascii_digit();
    bytes.len() == CODE_LEN
        && input.starts_with(PREFIX)
        && bytes[6] == b'-'
        && bytes[3..6].iter().all(symbol)
        && bytes[7..CODE_LEN].iter().all(symbol)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::convert::Infallible;

    fn counting_fill(start: u8) -> impl FnMut(&mut [u8]) -> Result<(), Infallible> {
        let mut next = start;
        move |buf: &mut [u8]| {
            for b in buf.iter_mut() {
                *b = next;
                next = next.wrapping_add(1);
            }
            Ok(())
        }
    }

    #[test]
    fn generated_code_has_the_contract_shape() {
        let code = RoomCode::generate(counting_fill(0)).unwrap();
        assert_eq!(code.as_str(), "km-abc-def");
        assert!(RoomCode::parse(code.as_str()).is_some());
    }

    #[test]
    fn bytes_at_or_above_the_unbiased_limit_are_discarded() {
        // 250, 251 are accepted (250 % 36 = 34 -> '8', 251 % 36 = 35 -> '9');
        // 252..=255 are rejected; then 0.. continue.
        let code = RoomCode::generate(counting_fill(250)).unwrap();
        assert_eq!(code.as_str(), "km-89a-bcd");
    }

    #[test]
    fn a_random_source_failure_propagates() {
        let result = RoomCode::generate(|_buf: &mut [u8]| Err::<(), &str>("no entropy"));
        assert_eq!(result.unwrap_err(), "no entropy");
    }

    #[test]
    fn every_symbol_is_equally_likely_over_one_full_byte_cycle() {
        // Feeding each byte value 0..=255 once must accept exactly 7 of each symbol.
        let mut counts = [0usize; 36];
        let all: Vec<u8> = (0..=255).collect();
        for &byte in &all {
            if byte < UNBIASED_LIMIT {
                counts[usize::from(byte % ALPHABET_LEN)] += 1;
            }
        }
        assert!(counts.iter().all(|&c| c == 7));
    }

    #[test]
    fn parse_rejects_anything_but_the_exact_shape() {
        for bad in [
            "standup", "", "km-abc-de", "km-abc-defg", "KM-abc-def", "km-ABC-def", "km_abc-def",
            "km-abcdef", "km-ab!-def", " km-abc-def", "km-abc-dé",
        ] {
            assert!(RoomCode::parse(bad).is_none(), "{bad:?} should not parse");
        }
        assert!(RoomCode::parse("km-4fq-82x").is_some());
    }
}
