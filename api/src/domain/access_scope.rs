use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
pub enum AccessScope {
    #[serde(rename = "administrator")]
    Administrator,
}

impl AccessScope {
    pub fn all() -> Vec<AccessScope> {
        vec![AccessScope::Administrator]
    }
}

impl fmt::Display for AccessScope {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            AccessScope::Administrator => "administrator",
        };
        write!(f, "{}", s)
    }
}

impl FromStr for AccessScope {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "administrator" => Ok(AccessScope::Administrator),
            _ => Err(format!("Unknown access scope: {}", s)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_access_scope_display() {
        assert_eq!(AccessScope::Administrator.to_string(), "administrator");
    }

    #[test]
    fn test_access_scope_from_str_valid() {
        assert_eq!(
            AccessScope::from_str("administrator").unwrap(),
            AccessScope::Administrator
        );
    }

    #[test]
    fn test_access_scope_from_str_invalid() {
        assert!(AccessScope::from_str("invalid_scope").is_err());
    }

    #[test]
    fn test_access_scope_all_contains_expected() {
        let all = AccessScope::all();
        assert_eq!(all.len(), 1);
        assert!(all.contains(&AccessScope::Administrator));
    }
}
