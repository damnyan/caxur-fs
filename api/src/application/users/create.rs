use crate::domain::password::PasswordHashingService;
use crate::domain::users::{NewUser, User, UserRepository};
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserRequest {
    #[validate(email(message = "Invalid email format"))]
    #[schema(example = "john@example.com")]
    pub email: String,
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    #[schema(example = "password123", min_length = 6)]
    pub password: String,
}

impl CreateUserRequest {
    /// Custom async validation to check if email already exists
    pub async fn validate_unique_email(
        &self,
        repo: &Arc<dyn UserRepository>,
    ) -> Result<(), AppError> {
        if (repo.find_by_email(&self.email).await?).is_some() {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "email",
                "Email already registered",
            )]));
        }
        Ok(())
    }
}

pub struct CreateUserUseCase {
    repo: Arc<dyn UserRepository>,
    password_hasher: Arc<dyn PasswordHashingService>,
}

impl CreateUserUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        password_hasher: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            repo,
            password_hasher,
        }
    }

    #[tracing::instrument(skip(self, req))]
    pub async fn execute(&self, req: CreateUserRequest) -> Result<User, AppError> {
        // Validate unique email using custom validator
        req.validate_unique_email(&self.repo).await?;

        // Hash the password using Argon2
        let password_hash = self
            .password_hasher
            .hash_password(&req.password)
            .map_err(AppError::InternalServerError)?;

        let new_user = NewUser {
            email: req.email,
            password_hash,
        };

        Ok(self.repo.create(new_user).await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::users::mocks::{MockPasswordHasher, MockUserRepository};
    use time::OffsetDateTime;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_create_user_success() {
        let repo = Arc::new(MockUserRepository::new());
        let hasher = Arc::new(MockPasswordHasher);
        let use_case = CreateUserUseCase::new(repo.clone(), hasher);

        let req = CreateUserRequest {
            email: "test@example.com".to_string(),
            password: "password123".to_string(),
        };

        let result = use_case.execute(req).await;
        assert!(result.is_ok());

        let user = result.unwrap();
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.password_hash, "password123_hashed");

        let saved = repo.find_by_email("test@example.com").await.unwrap();
        assert!(saved.is_some());
    }

    #[tokio::test]
    async fn test_create_user_duplicate_email() {
        let repo = Arc::new(MockUserRepository::new());

        // seed user
        repo.seed(User {
            id: Uuid::new_v4(),
            email: "existing@example.com".to_string(),
            password_hash: "hashed".to_string(),
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        });

        let hasher = Arc::new(MockPasswordHasher);
        let use_case = CreateUserUseCase::new(repo.clone(), hasher);

        let req = CreateUserRequest {
            email: "existing@example.com".to_string(),
            password: "password123".to_string(),
        };

        let result = use_case.execute(req).await;
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
