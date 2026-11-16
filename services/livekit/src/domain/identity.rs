//! Participant identities are server-generated: a slug of the display name plus a
//! random suffix. A client can never choose its identity, so it cannot take over
//! another participant's identity (LiveKit disconnects the older duplicate).

use super::DisplayName;

const SLUG_MAX: usize = 24;
const FALLBACK_SLUG: &str = "guest";

/// `suffix` must come from a CSPRNG; it is rendered as lowercase hex.
pub fn participant_identity(name: &DisplayName, suffix: &[u8]) -> String {
    let hex: String = suffix.iter().map(|b| format!("{b:02x}")).collect();
    format!("{}-{hex}", slugify(name.as_str()))
}

fn slugify(input: &str) -> String {
    let mut slug = String::with_capacity(SLUG_MAX + 1);
    let mut pending_dash = false;
    for c in input.chars() {
        if !c.is_ascii_alphanumeric() {
            pending_dash = true;
            continue;
        }
        if pending_dash && !slug.is_empty() {
            slug.push('-');
        }
        pending_dash = false;
        slug.push(c.to_ascii_lowercase());
        if slug.len() >= SLUG_MAX {
            break;
        }
    }
    if slug.is_empty() {
        FALLBACK_SLUG.to_owned()
    } else {
        slug
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn name(raw: &str) -> DisplayName {
        DisplayName::parse(raw).unwrap()
    }

    #[test]
    fn slugs_the_name_and_appends_the_suffix() {
        let id = participant_identity(&name("Ada  Lovelace!"), &[0x0a, 0xff]);
        assert_eq!(id, "ada-lovelace-0aff");
    }

    #[test]
    fn falls_back_when_the_name_has_no_ascii_letters() {
        assert_eq!(participant_identity(&name("李雷"), &[1]), "guest-01");
    }

    #[test]
    fn caps_the_slug_length() {
        let id = participant_identity(&name(&"a".repeat(60)), &[0]);
        assert_eq!(id, format!("{}-00", "a".repeat(SLUG_MAX)));
    }
}
