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
}

impl UpdateUserRequest {
    /// Custom async validation to check if email already exists (excluding current user)
    pub async fn validate_unique_email(
        &self,
        repo: &Arc<dyn UserRepository>,
        current_user_id: Uuid,
    ) -> Result<(), AppError> {
        if let Some(email) = &self.email
            && let Some(existing_user) = repo.find_by_email(email).await?
        {
            // Only error if the email belongs to a different user
            if existing_user.id != current_user_id {
                return Err(AppError::ValidationError(vec![FieldError::new(
                    "email",                // Changed from "username" to "email" to match context
                    "Email already exists", // Changed from "Username already exists" to "Email already exists" to match context
                )]));
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
        let existing = self.repo.find_by_id(id).await?;
        if existing.is_none() {
            return Err(AppError::NotFound(format!("User with id {} not found", id)));
        }

        // Validate unique email using custom validator (ignoring current user)
        req.validate_unique_email(&self.repo, id).await?;

        // Hash the password if it's being updated
        let password_hash = if let Some(password) = req.password {
            Some(
                self.password_hasher
                    .hash_password(&password)
                    .map_err(AppError::InternalServerError)?,
            )
        } else {
            None
        };

        let update = UpdateUser {
            email: req.email,
            password_hash,
        };

        Ok(self.repo.update(id, update).await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::users::mocks::{MockPasswordHasher, MockUserRepository};
    use time::OffsetDateTime;

    #[tokio::test]
    async fn test_update_user_success() {
        let repo = Arc::new(MockUserRepository::new());
        let id = Uuid::new_v4();
        
        repo.seed(User {
            id,
            email: "old@example.com".to_string(),
            password_hash: "old_hash".to_string(),
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let hasher = Arc::new(MockPasswordHasher);
        let use_case = UpdateUserUseCase::new(repo.clone(), hasher);

        let req = UpdateUserRequest {
            email: Some("new@example.com".to_string()),
            password: Some("newpassword".to_string()),
        };

        let result = use_case.execute(id, req).await;
        assert!(result.is_ok());

        let user = result.unwrap();
        assert_eq!(user.email, "new@example.com");
        assert_eq!(user.password_hash, "newpassword_hashed");
    }

    #[tokio::test]
    async fn test_update_user_not_found() {
        let repo = Arc::new(MockUserRepository::new());
        let hasher = Arc::new(MockPasswordHasher);
        let use_case = UpdateUserUseCase::new(repo.clone(), hasher);

        let req = UpdateUserRequest {
            email: Some("new@example.com".to_string()),
            password: None,
        };

        let result = use_case.execute(Uuid::new_v4(), req).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(_) => {}
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    async fn test_update_user_duplicate_email() {
        let repo = Arc::new(MockUserRepository::new());
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        
        repo.seed(User {
            id: id1,
            email: "user1@example.com".to_string(),
            password_hash: "hash".to_string(),
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        repo.seed(User {
            id: id2,
            email: "user2@example.com".to_string(),
            password_hash: "hash".to_string(),
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let hasher = Arc::new(MockPasswordHasher);
        let use_case = UpdateUserUseCase::new(repo.clone(), hasher);

        let req = UpdateUserRequest {
            email: Some("user2@example.com".to_string()), // Trying to use user2's email
            password: None,
        };

        let result = use_case.execute(id1, req).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::ValidationError(errors) => {
                assert_eq!(errors.len(), 1);
                assert_eq!(errors[0].field, "email");
            }
            _ => panic!("Expected ValidationError"),
        }
    }
}
