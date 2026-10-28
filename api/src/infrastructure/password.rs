use crate::domain::password::PasswordHashingService;
use anyhow::Result;
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use async_trait::async_trait;
use tokio::task;

/// Infrastructure service for password hashing and verification
#[derive(Clone)]
pub struct PasswordService;

impl PasswordService {
    pub fn new() -> Self {
        Self
    }
}

impl Default for PasswordService {
    fn default() -> Self {
        Self
    }
}

#[async_trait]
impl PasswordHashingService for PasswordService {
    /// Hash a plain text password using Argon2 on Tokio's blocking thread pool
    async fn hash_password(&self, password: &str) -> Result<String> {
        let password_owned = password.to_owned();
        task::spawn_blocking(move || {
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();

            let password_hash = argon2
                .hash_password(password_owned.as_bytes(), &salt)
                .map_err(|e| anyhow::anyhow!("Failed to hash password: {}", e))?
                .to_string();

            Ok(password_hash)
        })
        .await
        .map_err(|e| anyhow::anyhow!("Password hashing task panicked: {}", e))?
    }

    /// Verify a password against a hash on Tokio's blocking thread pool
    async fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        let password_owned = password.to_owned();
        let hash_owned = hash.to_owned();
        task::spawn_blocking(move || {
            let parsed_hash = PasswordHash::new(&hash_owned)
                .map_err(|e| anyhow::anyhow!("Invalid password hash: {}", e))?;

            let argon2 = Argon2::default();

            Ok(argon2
                .verify_password(password_owned.as_bytes(), &parsed_hash)
                .is_ok())
        })
        .await
        .map_err(|e| anyhow::anyhow!("Password verification task panicked: {}", e))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_hash_password() {
        let service = PasswordService::new();
        let password = "testpassword123";
        let hash = service.hash_password(password).await.unwrap();

        assert!(!hash.is_empty());
        assert!(hash.starts_with("$argon2"));
    }

    #[tokio::test]
    async fn test_verify_password_success() {
        let service = PasswordService::new();
        let password = "testpassword123";
        let hash = service.hash_password(password).await.unwrap();

        let is_valid = service.verify_password(password, &hash).await.unwrap();
        assert!(is_valid);
    }

    #[tokio::test]
    async fn test_verify_password_failure() {
        let service = PasswordService::new();
        let password = "testpassword123";
        let wrong_password = "wrongpassword";
        let hash = service.hash_password(password).await.unwrap();

        let is_valid = service
            .verify_password(wrong_password, &hash)
            .await
            .unwrap();
        assert!(!is_valid);
    }

    #[tokio::test]
    async fn test_different_hashes_for_same_password() {
        let service = PasswordService::new();
        let password = "testpassword123";
        let hash1 = service.hash_password(password).await.unwrap();
        let hash2 = service.hash_password(password).await.unwrap();

        // Different salts should produce different hashes
        assert_ne!(hash1, hash2);

        // But both should verify correctly
        assert!(service.verify_password(password, &hash1).await.unwrap());
        assert!(service.verify_password(password, &hash2).await.unwrap());
    }

    #[tokio::test]
    async fn test_default_implementation() {
        let service = PasswordService;
        let password = "testpassword123";
        let hash = service.hash_password(password).await.unwrap();
        assert!(service.verify_password(password, &hash).await.unwrap());
    }
}
