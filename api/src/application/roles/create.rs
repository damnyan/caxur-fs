use crate::domain::access_scope::AccessScope;
use crate::domain::roles::{NewRole, Role, RoleRepository};
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use validator::Validate;

use uuid::Uuid;

fn default_scope() -> AccessScope {
    AccessScope::Administrator
}

#[derive(Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoleRequest {
    #[validate(length(
        min = 3,
        max = 255,
        message = "Role name must be between 3 and 255 characters"
    ))]
    #[schema(example = "Admin", min_length = 3, max_length = 255)]
    pub name: String,
    #[schema(example = "Administrator role with full permissions")]
    pub description: Option<String>,
    #[serde(default = "default_scope")]
    #[schema(example = "ADMINISTRATOR")]
    pub scope: AccessScope,
    #[schema(example = "00000000-0000-0000-0000-000000000000")]
    pub group_id: Option<Uuid>,
}

impl CreateRoleRequest {
    /// Custom async validation to check if role name already exists
    pub async fn validate_unique_name(
        &self,
        repo: &Arc<dyn RoleRepository>,
    ) -> Result<(), AppError> {
        if repo
            .find_by_name(&self.name, self.scope, self.group_id)
            .await?
            .is_some()
        {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "name",                     // Changed from "role_id" to "name" to match the validation context
                "Role name already exists", // Kept the original error message
            )]));
        }
        Ok(())
    }
}

pub struct CreateRoleUseCase {
    repo: Arc<dyn RoleRepository>,
}

impl CreateRoleUseCase {
    pub fn new(repo: Arc<dyn RoleRepository>) -> Self {
        Self { repo }
    }

    #[tracing::instrument(skip(self, req))]
    pub async fn execute(&self, req: CreateRoleRequest) -> Result<Role, AppError> {
        // Validate unique name
        req.validate_unique_name(&self.repo).await?;

        let new_role = NewRole {
            name: req.name,
            description: req.description,
            scope: req.scope,
            group_id: req.group_id,
        };

        Ok(self.repo.create(new_role).await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::roles::mocks::MockRoleRepository;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_create_role_success() {
        let repo = Arc::new(MockRoleRepository::new());
        let use_case = CreateRoleUseCase::new(repo.clone());

        let req = CreateRoleRequest {
            name: "test_role".to_string(),
            description: Some("Test".to_string()),
            scope: AccessScope::Administrator,
            group_id: None,
        };

        let result = use_case.execute(req).await;
        assert!(result.is_ok());

        let role = result.unwrap();
        assert_eq!(role.name, "test_role");
        assert_eq!(role.scope, AccessScope::Administrator);

        let saved = repo.find_by_name("test_role", AccessScope::Administrator, None).await.unwrap();
        assert!(saved.is_some());
    }

    #[tokio::test]
    async fn test_create_role_duplicate_name() {
        let repo = Arc::new(MockRoleRepository::new());
        repo.seed(Role {
            id: Uuid::new_v4(),
            name: "duplicate".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = CreateRoleUseCase::new(repo);

        let req = CreateRoleRequest {
            name: "duplicate".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
        };

        let result = use_case.execute(req).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::ValidationError(_) => {}
            _ => panic!("Expected ValidationError"),
        }
    }
}
