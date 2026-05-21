use crate::domain::users::{User, UserRepository};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::{IntoParams, ToSchema};

use crate::shared::pagination::{default_page_number, default_page_size};

#[derive(Deserialize, IntoParams, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PageParams {
    /// Page number (1-indexed)
    #[serde(default = "default_page_number")]
    #[param(example = 1, minimum = 1)]
    pub number: i64,
    /// Number of items per page
    #[serde(default = "default_page_size")]
    #[param(example = 20, minimum = 1, maximum = 100)]
    pub size: i64,
    /// Cursor for cursor-based pagination (future use)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

#[derive(Deserialize, IntoParams, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListUsersRequest {
    /// Pagination parameters
    #[serde(default)]
    pub page: PageParams,
    /// Sort fields (comma-separated, prefix with - for descending) (future use)
    /// Example: "created_at" or "-created_at,email"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<String>,
}

impl Default for PageParams {
    fn default() -> Self {
        Self {
            number: default_page_number(),
            size: default_page_size(),
            cursor: None,
        }
    }
}

pub struct ListUsersUseCase {
    repo: Arc<dyn UserRepository>,
}

impl ListUsersUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    #[tracing::instrument(skip(self, req))]
    pub async fn execute(&self, req: ListUsersRequest) -> Result<Vec<User>, anyhow::Error> {
        // Enforce reasonable limits
        let per_page = req.page.size.clamp(1, 100);
        let page = req.page.number.max(1);

        // Calculate offset from page number (page is 1-indexed)
        let offset = (page - 1) * per_page;

        self.repo.find_all(per_page, offset).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::users::mocks::MockUserRepository;
    use time::OffsetDateTime;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_list_users_pagination() {
        let repo = Arc::new(MockUserRepository::new());
        for i in 0..5 {
            repo.seed(User {
                id: Uuid::new_v4(),
                email: format!("user{}@example.com", i),
                password_hash: "hash".to_string(),
                first_name: None,
                middle_name: None,
                last_name: None,
                suffix: None,
                created_at: OffsetDateTime::now_utc(),
                updated_at: OffsetDateTime::now_utc(),
            });
        }

        let use_case = ListUsersUseCase::new(repo);

        // Page 1, Size 2
        let req1 = ListUsersRequest {
            page: PageParams {
                number: 1,
                size: 2,
                cursor: None,
            },
            sort: None,
        };
        let page1 = use_case.execute(req1).await.unwrap();
        assert_eq!(page1.len(), 2);
        assert_eq!(page1[0].email, "user0@example.com");

        // Page 2, Size 2
        let req2 = ListUsersRequest {
            page: PageParams {
                number: 2,
                size: 2,
                cursor: None,
            },
            sort: None,
        };
        let page2 = use_case.execute(req2).await.unwrap();
        assert_eq!(page2.len(), 2);
        assert_eq!(page2[0].email, "user2@example.com");

        // Page 3, Size 2 (should only have 1 item left)
        let req3 = ListUsersRequest {
            page: PageParams {
                number: 3,
                size: 2,
                cursor: None,
            },
            sort: None,
        };
        let page3 = use_case.execute(req3).await.unwrap();
        assert_eq!(page3.len(), 1);
        assert_eq!(page3[0].email, "user4@example.com");

        // Negative sizing checks clamp
        let req_large = ListUsersRequest {
            page: PageParams {
                number: 1,
                size: 1000,
                cursor: None,
            },
            sort: None,
        };
        let page_large = use_case.execute(req_large).await.unwrap();
        // Clamps to 100, we seeded 5
        assert_eq!(page_large.len(), 5);
    }
}
