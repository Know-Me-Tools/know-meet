//! A string that never appears in `Debug` output and has no `Display`.

use std::fmt;

pub struct SecretString(String);

impl SecretString {
    pub fn new(value: String) -> Self {
        Self(value)
    }

    /// The only way to read the value. Call it only where the value is used to sign.
    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for SecretString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("SecretString(<redacted>)")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn debug_does_not_reveal_the_value() {
        let secret = SecretString::new("fake-value-123".to_owned());
        assert_eq!(format!("{secret:?}"), "SecretString(<redacted>)");
        assert_eq!(secret.expose(), "fake-value-123");
    }
}
