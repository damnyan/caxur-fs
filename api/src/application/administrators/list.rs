use crate::domain::administrators::{Administrator, AdministratorRepository};
use crate::shared::error::AppError;
use crate::shared::pagination::PageParams;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Deserialize, IntoParams, ToSchema)]
#[serde(rename_all = "camelCase")]
#[into_params(parameter_in = Query)]
pub struct ListAdministratorsRequest {
    /// Pagination parameters
    #[serde(default)]
    #[param(inline, style = DeepObject, explode = true)]
    pub page: PageParams,
    /// Search by name or email
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    /// Filter by role
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role_id: Option<Uuid>,
    /// Sort fields (comma-separated, prefix with - for descending) (future use)
    /// Example: "created_at" or "-created_at,email"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort: Option<String>,
    /// Included resources (comma-separated)
    /// Example: "roles"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include: Option<String>,
}

pub struct ListAdministratorsUseCase {
    repo: Arc<dyn AdministratorRepository>,
}

impl ListAdministratorsUseCase {
    pub fn new(repo: Arc<dyn AdministratorRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(
        &self,
        req: &ListAdministratorsRequest,
    ) -> Result<Vec<Administrator>, AppError> {
        // Enforce reasonable limits
        let per_page = req.page.size.clamp(1, 100);
        let page = req.page.number.max(1);

        // Calculate offset from page number (page is 1-indexed)
        let offset = (page - 1) * per_page;

        let admins = self
            .repo
            .find_all(req.search.clone(), req.role_id, per_page, offset)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(admins)
    }
}
