use crate::domain::access_scope::AccessScope;
use crate::domain::roles::{Role, RoleRepository};
use crate::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

pub struct ListRolesUseCase {
    repo: Arc<dyn RoleRepository>,
}

impl ListRolesUseCase {
    pub fn new(repo: Arc<dyn RoleRepository>) -> Self {
        Self { repo }
    }

    #[tracing::instrument(skip(self))]
    pub async fn execute(
        &self,
        scope: AccessScope,
        group_id: Option<Uuid>,
        per_page: i64,
        page: i64,
    ) -> Result<Vec<Role>, AppError> {
        // Enforce reasonable limits
        let per_page = per_page.clamp(1, 100);
        let page = page.max(1);

        // Calculate offset from page number (page is 1-indexed)
        let offset = (page - 1) * per_page;

        Ok(self
            .repo
            .find_all(scope, group_id, per_page, offset)
            .await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::roles::mocks::MockRoleRepository;
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_list_roles_pagination() {
        let repo = Arc::new(MockRoleRepository::new());
        for i in 0..5 {
            repo.seed(Role {
                id: Uuid::new_v4(),
                name: format!("role{}", i),
                description: None,
                scope: AccessScope::Administrator,
                group_id: None,
                created_at: OffsetDateTime::now_utc(),
                updated_at: OffsetDateTime::now_utc(),
            });
        }

        let use_case = ListRolesUseCase::new(repo);

        // Limit exactly 2 items on page 1
        let result1 = use_case.execute(AccessScope::Administrator, None, 2, 1).await.unwrap();
        assert_eq!(result1.len(), 2);
        assert_eq!(result1[0].name, "role0");

        // Out of bounds page
        let result2 = use_case.execute(AccessScope::Administrator, None, 2, 5).await.unwrap();
        assert_eq!(result2.len(), 0);

        // Clamp limit to 100
        let result3 = use_case.execute(AccessScope::Administrator, None, 1000, 1).await.unwrap();
        assert_eq!(result3.len(), 5);
    }
}
