use crate::domain::cache::{CacheService, PendingRegistration};
use crate::domain::email::EmailService;
use crate::domain::password::PasswordHashingService;
use crate::domain::users::UserRepository;
use crate::shared::error::AppError;
use crate::shared::validation::flatten_validation_errors;
use rand::RngExt;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitiateRegistrationRequest {
    #[serde(deserialize_with = "crate::shared::validation::deserialize_email")]
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(custom(function = "crate::shared::validation::validate_password_strength"))]
    pub password: String,
}

pub struct InitiateRegistrationUseCase {
    user_repository: Arc<dyn UserRepository>,
    cache_service: Arc<dyn CacheService>,
    email_service: Arc<dyn EmailService>,
    password_service: Arc<dyn PasswordHashingService>,
}

impl InitiateRegistrationUseCase {
    pub fn new(
        user_repository: Arc<dyn UserRepository>,
        cache_service: Arc<dyn CacheService>,
        email_service: Arc<dyn EmailService>,
        password_service: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            user_repository,
            cache_service,
            email_service,
            password_service,
        }
    }

    #[tracing::instrument(skip(self, request))]
    pub async fn execute(&self, request: InitiateRegistrationRequest) -> Result<(), AppError> {
        request
            .validate()
            .map_err(|e| AppError::ValidationError(flatten_validation_errors(e)))?;

        // 1. Check for email uniqueness
        if self
            .user_repository
            .find_by_email(&request.email)
            .await
            .map_err(AppError::InternalServerError)?
            .is_some()
        {
            return Err(AppError::BadRequest("Email already registered".to_string()));
        }

        // 2. Hash password
        let password_hash = self
            .password_service
            .hash_password(&request.password)
            .await
            .map_err(AppError::InternalServerError)?;

        // 3. Generate 6-digit OTP
        let otp: String = rand::rng().random_range(100_000..999_999).to_string();

        // 4. Store in cache (pending:email:{email})
        let pending = PendingRegistration {
            email: request.email.clone(),
            password_hash,
            otp: otp.clone(),
        };

        let pending_json =
            serde_json::to_string(&pending).map_err(|e| AppError::InternalServerError(e.into()))?;
        let key = format!("registration:pending:{}", request.email);
        self.cache_service
            .set(&key, pending_json, 600)
            .await
            .map_err(AppError::InternalServerError)?; // 10 minutes

        // 5. Send email
        self.email_service.send_templated_email(
            &request.email,
            "Verify your registration",
            "Verify Your Registration",
            &format!("<p>Your verification code is: <strong style='font-size: 24px; letter-spacing: 4px;'>{}</strong></p><p>This code will expire in 10 minutes.</p>", otp),
            None,
            None,
        )
        .await
        .map_err(AppError::InternalServerError)?;

        Ok(())
    }
}
