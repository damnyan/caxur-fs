use crate::domain::roles::{Role, RoleRepository, UpdateRole};
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRoleRequest {
    #[validate(length(
        min = 3,
        max = 255,
        message = "Role name must be between 3 and 255 characters"
    ))]
    #[schema(example = "Admin", min_length = 3, max_length = 255)]
    pub name: Option<String>,
    #[schema(example = "Administrator role with full permissions")]
    pub description: Option<String>,
}

pub struct UpdateRoleUseCase {
    repo: Arc<dyn RoleRepository>,
}

impl UpdateRoleUseCase {
    pub fn new(repo: Arc<dyn RoleRepository>) -> Self {
        Self { repo }
    }

    #[tracing::instrument(skip(self, req))]
    pub async fn execute(&self, id: Uuid, req: UpdateRoleRequest) -> Result<Role, AppError> {
        // Check if role exists
        let existing_role = self
            .repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Role with id {} not found", id)))?;

        // Check for duplicate name if name is being updated
        if let Some(ref name) = req.name
            && let Some(duplicate) = self
                .repo
                .find_by_name(name, existing_role.scope, existing_role.group_id)
                .await?
            && duplicate.id != id
        {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "name",
                "Role name already exists",
            )]));
        }

        let update = UpdateRole {
            name: req.name,
            description: req.description,
        };

        Ok(self.repo.update(id, update).await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::roles::mocks::MockRoleRepository;
    use crate::domain::access_scope::AccessScope;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_update_role_success() {
        let repo = Arc::new(MockRoleRepository::new());
        let role_id = Uuid::new_v4();
        
        repo.seed(Role {
            id: role_id,
            name: "old_role".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = UpdateRoleUseCase::new(repo.clone());
        let req = UpdateRoleRequest {
            name: Some("new_role".to_string()),
            description: Some("new desc".to_string()),
        };

        let result = use_case.execute(role_id, req).await;
        assert!(result.is_ok());

        let updated = result.unwrap();
        assert_eq!(updated.name, "new_role");
        assert_eq!(updated.description, Some("new desc".to_string()));
    }

    #[tokio::test]
    async fn test_update_role_not_found() {
        let repo = Arc::new(MockRoleRepository::new());
        let use_case = UpdateRoleUseCase::new(repo);

        let req = UpdateRoleRequest {
            name: Some("new_role".to_string()),
            description: None,
        };

        let result = use_case.execute(Uuid::new_v4(), req).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(_) => {}
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    async fn test_update_role_duplicate_name() {
        let repo = Arc::new(MockRoleRepository::new());
        let role_id1 = Uuid::new_v4();
        let role_id2 = Uuid::new_v4();

        repo.seed(Role {
            id: role_id1,
            name: "role1".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        repo.seed(Role {
            id: role_id2,
            name: "role2".to_string(),
            description: None,
            scope: AccessScope::Administrator,
            group_id: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let use_case = UpdateRoleUseCase::new(repo);
        
        let req = UpdateRoleRequest {
            name: Some("role2".to_string()), // Trying to rename role1 to role2
            description: None,
        };

        let result = use_case.execute(role_id1, req).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::ValidationError(_) => {}
            _ => panic!("Expected ValidationError"),
        }
    }
}
