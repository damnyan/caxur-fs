use crate::domain::roles::RoleRepository;
use crate::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

pub struct DeleteRoleUseCase {
    repo: Arc<dyn RoleRepository>,
}

impl DeleteRoleUseCase {
    pub fn new(repo: Arc<dyn RoleRepository>) -> Self {
        Self { repo }
    }

    #[tracing::instrument(skip(self))]
    pub async fn execute(&self, id: Uuid) -> Result<(), AppError> {
        let deleted = self.repo.delete(id).await?;
        if !deleted {
            return Err(AppError::NotFound(format!("Role with id {} not found", id)));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::roles::mocks::MockRoleRepository;
    use crate::domain::access_scope::AccessScope;
    use crate::domain::roles::Role;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_delete_role_success() {
        let repo = Arc::new(MockRoleRepository::new());
        let id = Uuid::new_v4();

        repo.seed(Role {
            id,
            name: "role".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = DeleteRoleUseCase::new(repo.clone());
        let result = use_case.execute(id).await;

        assert!(result.is_ok());

        // Verify it was actually deleted
        assert!(repo.find_by_id(id).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_delete_role_not_found() {
        let repo = Arc::new(MockRoleRepository::new());
        let use_case = DeleteRoleUseCase::new(repo);

        let result = use_case.execute(Uuid::new_v4()).await;

        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(_) => {}
            _ => panic!("Expected NotFound error"),
        }
    }
}
