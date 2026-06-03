use crate::domain::administrators::{AdministratorRepository, UpdateAdministrator};
use crate::domain::auth::AuthService;
use crate::domain::password::PasswordHashingService;
use crate::shared::error::AppError;
use serde::Deserialize;
use std::sync::Arc;
use time::OffsetDateTime;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VerifyAndSetPasswordRequest {
    pub token: String,
    #[validate(custom(function = "crate::shared::validation::validate_password_strength"))]
    pub password: String,
}

pub struct VerifyAndSetPasswordUseCase {
    repo: Arc<dyn AdministratorRepository>,
    auth_service: Arc<dyn AuthService>,
    password_service: Arc<dyn PasswordHashingService>,
}

impl VerifyAndSetPasswordUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        auth_service: Arc<dyn AuthService>,
        password_service: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            repo,
            auth_service,
            password_service,
        }
    }

    pub async fn execute(&self, req: VerifyAndSetPasswordRequest) -> Result<(), AppError> {
        let claims = self
            .auth_service
            .validate_token(&req.token)
            .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))?;

        if claims.token_type != "verification" {
            return Err(AppError::Unauthorized("Invalid token type".to_string()));
        }

        let user_id = claims
            .user_id()
            .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

        let admin = self
            .repo
            .find_by_id(user_id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;

        if admin.email_verified_at.is_some() {
            // They can still reset password if we want, but let's say verification is a one-time thing.
            // If we allow them to set password, that's fine. We'll just update it.
        }

        let password_hash = self
            .password_service
            .hash_password(&req.password)
            .map_err(AppError::InternalServerError)?;

        let update = UpdateAdministrator {
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            contact_number: None,
            email: None,
            password_hash: Some(password_hash),
            email_verified_at: Some(Some(OffsetDateTime::now_utc())),
            revoked_at: None,
        };

        self.repo
            .update(user_id, update)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(())
    }
}
