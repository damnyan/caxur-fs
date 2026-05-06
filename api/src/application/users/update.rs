use crate::domain::password::PasswordHashingService;
use crate::domain::users::{UpdateUser, User, UserRepository};
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRequest {
    #[validate(email(message = "Invalid email format"))]
    #[schema(example = "newemail@example.com")]
    pub email: Option<String>,

    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    #[schema(example = "newpassword123", min_length = 6)]
    pub password: Option<String>,

    pub current_password: Option<String>,

    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,
}

impl UpdateUserRequest {
    /// Custom async validation to check if email already exists (excluding current user)
    pub async fn validate_unique_email(
        &self,
        repo: &Arc<dyn UserRepository>,
        current_user_id: Uuid,
    ) -> Result<(), AppError> {
        if let Some(email) = &self.email {
            if let Some(existing_user) = repo.find_by_email(email).await.map_err(AppError::InternalServerError)? {
                // Only error if the email belongs to a different user
                if existing_user.id != current_user_id {
                    return Err(AppError::ValidationError(vec![FieldError::new(
                        "email",
                        "Email already exists",
                    )]));
                }
            }
        }
        Ok(())
    }
}

pub struct UpdateUserUseCase {
    repo: Arc<dyn UserRepository>,
    password_hasher: Arc<dyn PasswordHashingService>,
}

impl UpdateUserUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        password_hasher: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            repo,
            password_hasher,
        }
    }

    pub async fn execute(&self, id: Uuid, req: UpdateUserRequest) -> Result<User, AppError> {
        // Check if user exists
        let existing = self.repo.find_by_id(id).await.map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound(format!("User with id {} not found", id)))?;

        // Validate unique email using custom validator (ignoring current user)
        req.validate_unique_email(&self.repo, id).await?;

        // Hash the password if it's being updated
        let password_hash = if let Some(password) = &req.password {
            // Verify current password if new password is provided
            let current_password = req.current_password.as_ref()
                .ok_or_else(|| AppError::ValidationError(vec![FieldError::new("currentPassword", "Current password is required to change password")]))?;

            let is_valid = self.password_hasher.verify_password(current_password, &existing.password_hash)
                .map_err(AppError::InternalServerError)?;

            if !is_valid {
                return Err(AppError::ValidationError(vec![FieldError::new("currentPassword", "Invalid current password")]));
            }

            Some(
                self.password_hasher
                    .hash_password(password)
                    .map_err(AppError::InternalServerError)?,
            )
        } else {
            None
        };

        let update = UpdateUser {
            email: req.email,
            password_hash,
            first_name: req.first_name,
            middle_name: req.middle_name,
            last_name: req.last_name,
            suffix: req.suffix,
        };

        Ok(self.repo.update(id, update).await.map_err(AppError::InternalServerError)?)
    }
}
