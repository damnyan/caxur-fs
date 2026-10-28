use anyhow::Result;
use async_trait::async_trait;

/// Trait for password hashing and verification
#[async_trait]
pub trait PasswordHashingService: Send + Sync {
    async fn hash_password(&self, password: &str) -> Result<String>;
    async fn verify_password(&self, password: &str, hash: &str) -> Result<bool>;
}
