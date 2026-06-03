use crate::domain::cache::CacheService;
use crate::domain::password::PasswordHashingService;
use crate::domain::users::{UpdateUser, UserRepository};
use crate::infrastructure::email::EmailService;
use crate::shared::error::AppError;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RequestPasswordResetRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
}

pub struct RequestPasswordResetUseCase {
    repo: Arc<dyn UserRepository>,
    cache_service: Arc<dyn CacheService>,
    email_service: Arc<dyn EmailService>,
}

impl RequestPasswordResetUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        cache_service: Arc<dyn CacheService>,
        email_service: Arc<dyn EmailService>,
    ) -> Self {
        Self {
            repo,
            cache_service,
            email_service,
        }
    }

    pub async fn execute(&self, req: RequestPasswordResetRequest) -> Result<(), AppError> {
        // 1. Find user by email
        let user = match self
            .repo
            .find_by_email(&req.email)
            .await
            .map_err(AppError::InternalServerError)?
        {
            Some(u) => u,
            None => {
                // Return success even if not found to prevent email enumeration
                return Ok(());
            }
        };

        // 2. Generate a secure token
        let token = Uuid::new_v4().to_string();

        // 3. Store in cache (15 minutes TTL)
        let key = format!("user_password_reset:{}", token);
        self.cache_service
            .set(&key, user.id.to_string(), 900)
            .await
            .map_err(AppError::InternalServerError)?;

        // 4. Send email
        let base_url =
            std::env::var("CLIENT_URL").unwrap_or_else(|_| "http://localhost:3002".to_string());
        let reset_link = format!("{}/reset-password?token={}", base_url, token);

        self.email_service.send_templated_email(
            &req.email,
            "Password Reset Request",
            "Reset Your Password",
            &format!(
                "<p>We received a request to reset your password for your account.</p>\
                 <p>If you made this request, please click the link below to set a new password:</p>\
                 <p><a href=\"{}\">Reset Password</a></p>\
                 <p>This link will expire in 15 minutes.</p>\
                 <p>If you did not request a password reset, you can safely ignore this email.</p>",
                reset_link
            ),
            None,
            None,
        ).await.map_err(AppError::InternalServerError)?;

        Ok(())
    }
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmPasswordResetRequest {
    #[validate(length(min = 1, message = "Token is required"))]
    pub token: String,
    #[validate(custom(function = "crate::shared::validation::validate_password_strength"))]
    pub new_password: String,
}

pub struct ConfirmPasswordResetUseCase {
    repo: Arc<dyn UserRepository>,
    cache_service: Arc<dyn CacheService>,
    password_service: Arc<dyn PasswordHashingService>,
}

impl ConfirmPasswordResetUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        cache_service: Arc<dyn CacheService>,
        password_service: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            repo,
            cache_service,
            password_service,
        }
    }

    pub async fn execute(&self, req: ConfirmPasswordResetRequest) -> Result<(), AppError> {
        let key = format!("user_password_reset:{}", req.token);

        // 1. Get user id from cache
        let user_id_str = self
            .cache_service
            .get(&key)
            .await
            .map_err(AppError::InternalServerError)?;

        let user_id = match user_id_str {
            Some(id_str) => Uuid::parse_str(&id_str).map_err(|_| {
                AppError::InternalServerError(anyhow::anyhow!("Invalid UUID in cache"))
            })?,
            None => {
                return Err(AppError::BadRequest(
                    "Invalid or expired password reset token".to_string(),
                ));
            }
        };

        // 2. Hash new password
        let new_password_hash = self
            .password_service
            .hash_password(&req.new_password)
            .map_err(AppError::InternalServerError)?;

        // 3. Update password
        let update_struct = UpdateUser {
            email: None,
            password_hash: Some(new_password_hash),
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            face_photo: None,
        };

        self.repo
            .update(user_id, update_struct)
            .await
            .map_err(AppError::InternalServerError)?;

        // 4. Delete token from cache
        let _ = self.cache_service.delete(&key).await;

        Ok(())
    }
}
