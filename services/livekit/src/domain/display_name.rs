//! The name a guest shows on their tile. Never used as an identity.

use thiserror::Error;

pub const NAME_MAX_CHARS: usize = 60;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DisplayName(String);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum DisplayNameError {
    #[error("the name is empty")]
    Empty,
    #[error("the name is longer than {NAME_MAX_CHARS} characters")]
    TooLong,
}

impl DisplayName {
    /// Removes control characters, trims, then requires 1 to 60 characters.
    pub fn parse(raw: &str) -> Result<Self, DisplayNameError> {
        let cleaned: String = raw.chars().filter(|c| !c.is_control()).collect();
        let trimmed = cleaned.trim();
        if trimmed.is_empty() {
            return Err(DisplayNameError::Empty);
        }
        if trimmed.chars().count() > NAME_MAX_CHARS {
            return Err(DisplayNameError::TooLong);
        }
        Ok(Self(trimmed.to_owned()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_and_strips_control_characters() {
        let name = DisplayName::parse("  Ada\u{0007} Lovelace\n ").unwrap();
        assert_eq!(name.as_str(), "Ada Lovelace");
    }

    #[test]
    fn rejects_empty_and_whitespace_only() {
        assert_eq!(DisplayName::parse(""), Err(DisplayNameError::Empty));
        assert_eq!(DisplayName::parse(" \t\u{0000} "), Err(DisplayNameError::Empty));
    }

    #[test]
    fn counts_characters_not_bytes() {
        let sixty = "é".repeat(NAME_MAX_CHARS);
        assert!(DisplayName::parse(&sixty).is_ok());
        let sixty_one = "é".repeat(NAME_MAX_CHARS + 1);
        assert_eq!(DisplayName::parse(&sixty_one), Err(DisplayNameError::TooLong));
    }
}
