use crate::domain::administrators::{Administrator, AdministratorRepository, UpdateAdministrator};
use crate::shared::error::AppError;
use std::sync::Arc;
use time::OffsetDateTime;
use uuid::Uuid;

pub struct RevokeAdministratorUseCase {
    repo: Arc<dyn AdministratorRepository>,
}

impl RevokeAdministratorUseCase {
    pub fn new(repo: Arc<dyn AdministratorRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<Administrator, AppError> {
        let admin = self
            .repo
            .find_by_id(id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;

        if admin.revoked_at.is_some() {
            return Err(AppError::BadRequest(
                "Administrator is already revoked".to_string(),
            ));
        }

        let update = UpdateAdministrator {
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            contact_number: None,
            email: None,
            password_hash: None,
            email_verified_at: None,
            revoked_at: Some(Some(OffsetDateTime::now_utc())),
        };

        let updated_admin = self
            .repo
            .update(id, update)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(updated_admin)
    }
}
