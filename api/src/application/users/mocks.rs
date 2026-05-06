#![cfg(test)]

use crate::domain::password::PasswordHashingService;
use crate::domain::users::{NewUser, UpdateUser, User, UserRepository};
use async_trait::async_trait;
use std::sync::{Arc, Mutex};
use time::OffsetDateTime;
use uuid::Uuid;

pub struct MockPasswordHasher;

#[async_trait]
impl PasswordHashingService for MockPasswordHasher {
    fn hash_password(&self, password: &str) -> anyhow::Result<String> {
        Ok(format!("{}_hashed", password))
    }

    fn verify_password(&self, password: &str, hash: &str) -> anyhow::Result<bool> {
        Ok(format!("{}_hashed", password) == hash)
    }
}

pub struct MockUserRepository {
    pub users: Arc<Mutex<Vec<User>>>,
}

impl MockUserRepository {
    pub fn new() -> Self {
        Self {
            users: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    pub fn seed(&self, user: User) {
        self.users.lock().unwrap().push(user);
    }
}

#[async_trait]
impl UserRepository for MockUserRepository {
    async fn create(&self, new_user: NewUser) -> Result<User, anyhow::Error> {
        let user = User {
            id: Uuid::new_v4(),
            email: new_user.email,
            password_hash: new_user.password_hash,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        };
        self.users.lock().unwrap().push(user.clone());
        Ok(user)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, anyhow::Error> {
        let guard = self.users.lock().unwrap();
        Ok(guard.iter().find(|u| u.id == id).cloned())
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, anyhow::Error> {
        let guard = self.users.lock().unwrap();
        Ok(guard.iter().find(|u| u.email == email).cloned())
    }

    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<User>, anyhow::Error> {
        let guard = self.users.lock().unwrap();
        let skipped = guard.iter().skip(offset as usize).take(limit as usize).cloned().collect();
        Ok(skipped)
    }

    async fn count(&self) -> Result<i64, anyhow::Error> {
        Ok(self.users.lock().unwrap().len() as i64)
    }

    async fn update(&self, id: Uuid, update: UpdateUser) -> Result<User, anyhow::Error> {
        let mut guard = self.users.lock().unwrap();
        if let Some(user) = guard.iter_mut().find(|u| u.id == id) {
            if let Some(email) = update.email {
                user.email = email;
            }
            if let Some(hash) = update.password_hash {
                user.password_hash = hash;
            }
            user.updated_at = OffsetDateTime::now_utc();
            return Ok(user.clone());
        }
        Err(anyhow::anyhow!("User not found"))
    }

    async fn delete(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let mut guard = self.users.lock().unwrap();
        let initial_len = guard.len();
        guard.retain(|u| u.id != id);
        Ok(guard.len() < initial_len)
    }
}
