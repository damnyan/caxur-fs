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

impl Default for MockUserRepository {
    fn default() -> Self {
        Self {
            users: Arc::new(Mutex::new(Vec::new())),
        }
    }
}

impl MockUserRepository {
    pub fn new() -> Self {
        Self::default()
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
            first_name: new_user.first_name,
            middle_name: new_user.middle_name,
            last_name: new_user.last_name,
            suffix: new_user.suffix,
            face_photo: new_user.face_photo,
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
        let skipped = guard
            .iter()
            .skip(offset as usize)
            .take(limit as usize)
            .cloned()
            .collect();
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
            if let Some(first_name) = update.first_name {
                user.first_name = Some(first_name);
            }
            if let Some(middle_name) = update.middle_name {
                user.middle_name = Some(middle_name);
            }
            if let Some(last_name) = update.last_name {
                user.last_name = Some(last_name);
            }
            if let Some(suffix) = update.suffix {
                user.suffix = Some(suffix);
            }
            if let Some(face_photo) = update.face_photo {
                user.face_photo = Some(face_photo);
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
