//! Quiz result code: six digits 0–2, one per letter of ПОБЕДА
//! (0 — fell off, 1 — hanging, 2 — on the board). Mirrors `@beda/core`
//! `result-code.ts` and `classify()`; both are tested against
//! `packages/core/fixtures/result-codes.json`.

/// Per-letter states in word order.
pub type States = [u8; 6];

/// Strictly parses a code: exactly six ASCII digits `0`–`2`.
pub fn parse(code: &str) -> Option<States> {
    let bytes = code.as_bytes();
    if bytes.len() != 6 {
        return None;
    }
    let mut states = [0_u8; 6];
    for (slot, &b) in states.iter_mut().zip(bytes) {
        if !(b'0'..=b'2').contains(&b) {
            return None;
        }
        *slot = b - b'0';
    }
    Some(states)
}

/// Ship class id, same rules and order as `classify()` in `@beda/core`.
/// A state of 2 means ≥ 2 nails ("mounted"), 1 means hanging, 0 fallen.
#[allow(clippy::naive_bytecount)] // six elements, no need for bytecount
pub fn classify(states: &States) -> &'static str {
    let mounted = states.iter().filter(|&&s| s == 2).count();
    let po_only = states[0] == 0 && states[1] == 0 && states[2..].iter().all(|&s| s >= 1);
    if po_only {
        "beda-po"
    } else if mounted == 6 {
        "flagship"
    } else if mounted >= 4 {
        "schooner"
    } else if mounted >= 2 {
        "beda"
    } else {
        "slipway"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(serde::Deserialize)]
    struct Fixture {
        valid: Vec<String>,
        invalid: Vec<String>,
    }

    fn fixture() -> Fixture {
        serde_json::from_str(include_str!(
            "../../../../packages/core/fixtures/result-codes.json"
        ))
        .unwrap()
    }

    #[test]
    fn agrees_with_the_shared_fixture() {
        let f = fixture();
        for code in &f.valid {
            assert!(parse(code).is_some(), "{code:?} should be valid");
        }
        for code in &f.invalid {
            assert!(parse(code).is_none(), "{code:?} should be invalid");
        }
    }

    #[test]
    fn parses_digits() {
        assert_eq!(parse("002212"), Some([0, 0, 2, 2, 1, 2]));
    }

    #[test]
    fn all_729_codes_parse() {
        let mut n = 0;
        for a in 0..3 {
            for b in 0..3 {
                for c in 0..3 {
                    for d in 0..3 {
                        for e in 0..3 {
                            for f in 0..3 {
                                let code = format!("{a}{b}{c}{d}{e}{f}");
                                assert!(parse(&code).is_some());
                                n += 1;
                            }
                        }
                    }
                }
            }
        }
        assert_eq!(n, 729);
    }

    #[test]
    fn classifies_like_the_frontend() {
        assert_eq!(classify(&[2, 2, 2, 2, 2, 2]), "flagship");
        assert_eq!(classify(&[0, 0, 1, 2, 2, 2]), "beda-po");
        assert_eq!(classify(&[0, 0, 0, 2, 2, 2]), "beda");
        assert_eq!(classify(&[2, 2, 2, 2, 1, 0]), "schooner");
        assert_eq!(classify(&[2, 2, 1, 1, 0, 0]), "beda");
        assert_eq!(classify(&[1, 1, 1, 0, 0, 1]), "slipway");
    }
}
