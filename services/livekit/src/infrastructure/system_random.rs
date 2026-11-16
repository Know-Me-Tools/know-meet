//! The operating system CSPRNG through `getrandom`.

use crate::application::{RandomError, RandomSource};

#[derive(Debug, Default, Clone, Copy)]
pub struct SystemRandom;

impl RandomSource for SystemRandom {
    fn fill(&self, dest: &mut [u8]) -> Result<(), RandomError> {
        getrandom::fill(dest).map_err(|error| {
            tracing::error!(event = "random_source_failed", %error);
            RandomError
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fills_the_buffer() {
        let mut buf = [0u8; 32];
        SystemRandom.fill(&mut buf).unwrap();
        // 32 zero bytes from a working CSPRNG has probability 2^-256.
        assert!(buf.iter().any(|&b| b != 0));
    }
}
