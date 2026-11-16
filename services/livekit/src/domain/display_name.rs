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
    /// Removes control and format characters, trims, then requires 1 to 60 characters.
    pub fn parse(raw: &str) -> Result<Self, DisplayNameError> {
        let cleaned: String = raw.chars().filter(|&c| !c.is_control() && !is_format_char(c)).collect();
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

/// Unicode general category Cf (format characters), as of Unicode 16. These are invisible
/// and include bidi overrides (U+202A..U+202E, U+2066..U+2069) that can make one name
/// render as another. Removing them also drops ZWJ and ZWNJ: emoji sequences fall apart
/// into their parts and some scripts lose a joining hint, which is acceptable for a tile label.
const FORMAT_RANGES: &[(char, char)] = &[
    ('\u{00AD}', '\u{00AD}'),
    ('\u{0600}', '\u{0605}'),
    ('\u{061C}', '\u{061C}'),
    ('\u{06DD}', '\u{06DD}'),
    ('\u{070F}', '\u{070F}'),
    ('\u{0890}', '\u{0891}'),
    ('\u{08E2}', '\u{08E2}'),
    ('\u{180E}', '\u{180E}'),
    ('\u{200B}', '\u{200F}'),
    ('\u{202A}', '\u{202E}'),
    ('\u{2060}', '\u{2064}'),
    ('\u{2066}', '\u{206F}'),
    ('\u{FEFF}', '\u{FEFF}'),
    ('\u{FFF9}', '\u{FFFB}'),
    ('\u{110BD}', '\u{110BD}'),
    ('\u{110CD}', '\u{110CD}'),
    ('\u{13430}', '\u{1343F}'),
    ('\u{1BCA0}', '\u{1BCA3}'),
    ('\u{1D173}', '\u{1D17A}'),
    ('\u{E0001}', '\u{E0001}'),
    ('\u{E0020}', '\u{E007F}'),
];

fn is_format_char(c: char) -> bool {
    FORMAT_RANGES.iter().any(|&(start, end)| (start..=end).contains(&c))
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
    fn strips_bidi_overrides_and_invisible_format_characters() {
        let name = DisplayName::parse("\u{202E}Ada\u{200B} Love\u{2066}lace\u{FEFF}\u{E0041}").unwrap();
        assert_eq!(name.as_str(), "Ada Lovelace");
        assert_eq!(DisplayName::parse("\u{200B}\u{202E}\u{2060}"), Err(DisplayNameError::Empty));
        // Ordinary letters next to the ranges are kept.
        assert_eq!(DisplayName::parse("Zoë \u{0627}\u{0644}").unwrap().as_str(), "Zoë \u{0627}\u{0644}");
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
