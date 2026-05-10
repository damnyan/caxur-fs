use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingRegistration {
    pub email: String,
    pub password_hash: String,
    pub otp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingEmailChange {
    pub new_email: String,
    pub otp: String,
    pub cancel_token: String,
}

#[async_trait]
pub trait CacheService: Send + Sync {
    async fn set(&self, key: &str, value: String, ttl_seconds: u64) -> Result<(), anyhow::Error>;
    async fn get(&self, key: &str) -> Result<Option<String>, anyhow::Error>;
    async fn delete(&self, key: &str) -> Result<(), anyhow::Error>;
}
