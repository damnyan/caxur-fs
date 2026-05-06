use crate::domain::users::{User, UserRepository};
use std::sync::Arc;
use uuid::Uuid;

pub struct GetUserUseCase {
    repo: Arc<dyn UserRepository>,
}

impl GetUserUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<Option<User>, anyhow::Error> {
        self.repo.find_by_id(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::users::mocks::MockUserRepository;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_get_user_success() {
        let repo = Arc::new(MockUserRepository::new());
        let id = Uuid::new_v4();
        
        repo.seed(User {
            id,
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = GetUserUseCase::new(repo);
        let result = use_case.execute(id).await;
        
        assert!(result.is_ok());
        let user_opt = result.unwrap();
        assert!(user_opt.is_some());
        assert_eq!(user_opt.unwrap().email, "test@example.com");
    }

    #[tokio::test]
    async fn test_get_user_not_found() {
        let repo = Arc::new(MockUserRepository::new());
        let use_case = GetUserUseCase::new(repo);
        
        let result = use_case.execute(Uuid::new_v4()).await;
        
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }
}
