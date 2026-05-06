use crate::domain::administrators::{Administrator, AdministratorRepository, UpdateAdministrator};
use crate::shared::error::AppError;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMyProfileRequest {
    #[validate(length(min = 1))]
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    #[validate(length(min = 1))]
    pub last_name: Option<String>,
    pub suffix: Option<String>,
    pub contact_number: Option<String>,
}

pub struct UpdateMyProfileUseCase {
    repo: Arc<dyn AdministratorRepository>,
}

impl UpdateMyProfileUseCase {
    pub fn new(repo: Arc<dyn AdministratorRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(
        &self,
        id: Uuid,
        req: UpdateMyProfileRequest,
    ) -> Result<Administrator, AppError> {
        let administrator = self
            .repo
            .find_by_id(id)
            .await
            .map_err(AppError::InternalServerError)?;

        if administrator.is_none() {
            return Err(AppError::NotFound("Administrator not found".to_string()));
        }

        let update_struct = UpdateAdministrator {
            first_name: req.first_name,
            middle_name: req.middle_name,
            last_name: req.last_name,
            suffix: req.suffix,
            contact_number: req.contact_number,
            email: None,
            password_hash: None,
            email_verified_at: None,
            revoked_at: None,
        };

        let admin = self
            .repo
            .update(id, update_struct)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(admin)
    }
}
