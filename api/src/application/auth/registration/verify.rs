use crate::application::auth::token_utils::{TokenResponse, generate_and_store_tokens};
use crate::domain::auth::{AuthService, RefreshTokenRepository};
use crate::domain::cache::{CacheService, PendingRegistration};
use crate::domain::users::{NewUser, User, UserRepository};
use crate::shared::error::AppError;
use crate::shared::validation::flatten_validation_errors;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VerifyRegistrationRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(length(equal = 6, message = "OTP must be 6 digits"))]
    pub otp: String,
}

pub type VerifyRegistrationResponse = TokenResponse;
pub type VerifyRegistrationUseCaseResult = (VerifyRegistrationResponse, User);

pub struct VerifyRegistrationUseCase {
    user_repository: Arc<dyn UserRepository>,
    cache_service: Arc<dyn CacheService>,
    refresh_token_repo: Arc<dyn RefreshTokenRepository>,
    auth_service: Arc<dyn AuthService>,
    access_token_expiry: i64,
    refresh_token_expiry: i64,
}

impl VerifyRegistrationUseCase {
    pub fn new(
        user_repository: Arc<dyn UserRepository>,
        cache_service: Arc<dyn CacheService>,
        refresh_token_repo: Arc<dyn RefreshTokenRepository>,
        auth_service: Arc<dyn AuthService>,
        access_token_expiry: i64,
        refresh_token_expiry: i64,
    ) -> Self {
        Self {
            user_repository,
            cache_service,
            refresh_token_repo,
            auth_service,
            access_token_expiry,
            refresh_token_expiry,
        }
    }

    pub async fn execute(&self, request: VerifyRegistrationRequest) -> Result<VerifyRegistrationUseCaseResult, AppError> {
        request.validate().map_err(|e| AppError::ValidationError(flatten_validation_errors(e)))?;

        // 1. Fetch from cache
        let key = format!("registration:pending:{}", request.email);
        let pending_json = self.cache_service.get(&key).await
            .map_err(AppError::InternalServerError)?
            .ok_or(AppError::NotFound("Registration session expired or not found".to_string()))?;

        let pending: PendingRegistration = serde_json::from_str(&pending_json)
            .map_err(|e| AppError::InternalServerError(anyhow::anyhow!("Failed to parse pending registration: {}", e)))?;

        // 2. Compare OTP
        if pending.otp != request.otp {
            return Err(AppError::BadRequest("Invalid verification code".to_string()));
        }

        // 3. Double-check email uniqueness
        if let Some(_) = self.user_repository.find_by_email(&request.email).await
            .map_err(AppError::InternalServerError)? {
            return Err(AppError::BadRequest("Email already registered".to_string()));
        }

        // 4. Create user in DB
        let new_user = NewUser {
            email: pending.email.clone(),
            password_hash: pending.password_hash.clone(),
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
        };

        let user = self.user_repository.create(new_user).await
            .map_err(AppError::InternalServerError)?;

        // 5. Remove from cache
        self.cache_service.delete(&key).await
            .map_err(AppError::InternalServerError)?;

        // 6. Generate tokens
        let tokens = generate_and_store_tokens(
            user.id,
            "user".to_string(),
            &self.auth_service,
            &self.refresh_token_repo,
            self.access_token_expiry,
            self.refresh_token_expiry,
        )
        .await?;

        Ok((tokens, user))
    }
}
