use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip)]
    pub password_hash: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,

    #[serde(with = "time::serde::iso8601")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::iso8601")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone)]
pub struct NewUser {
    pub email: String,
    pub password_hash: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create(&self, new_user: NewUser) -> Result<User, anyhow::Error>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, anyhow::Error>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, anyhow::Error>;
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<User>, anyhow::Error>;
    async fn count(&self) -> Result<i64, anyhow::Error>;
    async fn update(&self, id: Uuid, update: UpdateUser) -> Result<User, anyhow::Error>;
    async fn delete(&self, id: Uuid) -> Result<bool, anyhow::Error>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_user_creation() {
        let user = NewUser {
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
        };

        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.password_hash, "hash");
    }

    #[test]
    fn test_update_user_creation() {
        let update = UpdateUser {
            email: Some("new@example.com".to_string()),
            password_hash: None,
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
        };

        assert_eq!(update.email, Some("new@example.com".to_string()));
        assert_eq!(update.password_hash, None);
    }
}
