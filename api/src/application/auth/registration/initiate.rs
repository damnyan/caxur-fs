use crate::domain::cache::{CacheService, PendingRegistration};
use crate::domain::password::PasswordHashingService;
use crate::domain::users::UserRepository;
use crate::infrastructure::email::EmailService;
use rand::RngExt;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitiateRegistrationRequest {
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

    pub async fn execute(&self, request: InitiateRegistrationRequest) -> Result<(), anyhow::Error> {
        request.validate()?;

        // 1. Check for email uniqueness
        if self
            .user_repository
            .find_by_email(&request.email)
            .await?
            .is_some()
        {
            return Err(anyhow::anyhow!("Email already registered"));
        }

        // 2. Hash password
        let password_hash = self.password_service.hash_password(&request.password)?;

        // 3. Generate 6-digit OTP
        let otp: String = rand::rng().random_range(100_000..999_999).to_string();

        // 4. Store in cache (pending:email:{email})
        let pending = PendingRegistration {
            email: request.email.clone(),
            password_hash,
            otp: otp.clone(),
        };

        let pending_json = serde_json::to_string(&pending)?;
        let key = format!("registration:pending:{}", request.email);
        self.cache_service.set(&key, pending_json, 600).await?; // 10 minutes

        // Log OTP to console in development
        tracing::info!("🔑 [DEV ONLY] Generated OTP for {}: {}", request.email, otp);

        // 5. Send email
        self.email_service.send_templated_email(
            &request.email,
            "Verify your registration",
            "Verify Your Registration",
            &format!("<p>Your verification code is: <strong style='font-size: 24px; letter-spacing: 4px;'>{}</strong></p><p>This code will expire in 10 minutes.</p>", otp),
            None,
            None,
        ).await?;

        Ok(())
    }
}
