use crate::domain::users::UserRepository;
use std::sync::Arc;
use uuid::Uuid;

pub struct DeleteUserUseCase {
    repo: Arc<dyn UserRepository>,
}

impl DeleteUserUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        self.repo.delete(id).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::users::mocks::MockUserRepository;
    use crate::domain::users::User;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_delete_user_success() {
        let repo = Arc::new(MockUserRepository::new());
        let id = Uuid::new_v4();

        repo.seed(User {
            id,
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = DeleteUserUseCase::new(repo.clone());
        let result = use_case.execute(id).await;

        assert!(result.is_ok());
        assert!(result.unwrap());

        // Verify it was actually deleted
        assert!(repo.find_by_id(id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_delete_user_not_found() {
        let repo = Arc::new(MockUserRepository::new());
        let use_case = DeleteUserUseCase::new(repo);

        let result = use_case.execute(Uuid::new_v4()).await;

        assert!(result.is_ok());
        assert!(!result.unwrap()); // Should return false
    }
}
