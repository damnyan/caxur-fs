use crate::domain::administrators::{AdministratorRepository, UpdateAdministrator};
use crate::domain::password::PasswordHashingService;
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMyPasswordRequest {
    #[validate(length(min = 1, message = "Current password is required"))]
    pub current_password: String,
    #[validate(length(min = 6, message = "New password must be at least 6 characters"))]
    #[schema(example = "newpassword123", min_length = 6)]
    pub new_password: String,
}

pub struct UpdateMyPasswordUseCase {
    repo: Arc<dyn AdministratorRepository>,
    password_service: Arc<dyn PasswordHashingService>,
}

impl UpdateMyPasswordUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        password_service: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            repo,
            password_service,
        }
    }

    pub async fn execute(
        &self,
        id: Uuid,
        req: UpdateMyPasswordRequest,
    ) -> Result<(), AppError> {
        let administrator = self
            .repo
            .find_by_id(id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;

        // Verify current password
        let is_valid = self
            .password_service
            .verify_password(&req.current_password, &administrator.password_hash)
            .map_err(AppError::InternalServerError)?;

        if !is_valid {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "currentPassword",
                "Incorrect current password",
            )]));
        }

        // Hash new password
        let new_password_hash = self
            .password_service
            .hash_password(&req.new_password)
            .map_err(AppError::InternalServerError)?;

        let update_struct = UpdateAdministrator {
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            contact_number: None,
            email: None,
            password_hash: Some(new_password_hash),
            email_verified_at: None,
            revoked_at: None,
        };

        self.repo
            .update(id, update_struct)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(())
    }
}
