use crate::domain::roles::{Role, RoleRepository};
use crate::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

pub struct GetRoleUseCase {
    repo: Arc<dyn RoleRepository>,
}

impl GetRoleUseCase {
    pub fn new(repo: Arc<dyn RoleRepository>) -> Self {
        Self { repo }
    }

    #[tracing::instrument(skip(self))]
    pub async fn execute(&self, id: Uuid) -> Result<Role, AppError> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Role with id {} not found", id)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::roles::mocks::MockRoleRepository;
    use crate::domain::access_scope::AccessScope;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_get_role_success() {
        let repo = Arc::new(MockRoleRepository::new());
        let role_id = Uuid::new_v4();
        
        repo.seed(Role {
            id: role_id,
            name: "role".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = GetRoleUseCase::new(repo);
        let result = use_case.execute(role_id).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().name, "role");
    }

    #[tokio::test]
    async fn test_get_role_not_found() {
        let repo = Arc::new(MockRoleRepository::new());
        let use_case = GetRoleUseCase::new(repo);
        
        let result = use_case.execute(Uuid::new_v4()).await;
        
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(_) => {}
            _ => panic!("Expected NotFound error"),
        }
    }
}
