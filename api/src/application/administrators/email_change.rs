use crate::domain::administrators::{AdministratorRepository, UpdateAdministrator};
use crate::domain::cache::{CacheService, PendingEmailChange};
use crate::domain::password::PasswordHashingService;
use crate::infrastructure::email::EmailService;
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;
use rand::RngExt;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitiateEmailChangeRequest {
    #[validate(length(min = 1, message = "Current password is required"))]
    pub current_password: String,
    #[validate(email(message = "Invalid email format"))]
    pub new_email: String,
}

pub struct InitiateEmailChangeUseCase {
    repo: Arc<dyn AdministratorRepository>,
    password_service: Arc<dyn PasswordHashingService>,
    cache_service: Arc<dyn CacheService>,
    email_service: Arc<dyn EmailService>,
}

impl InitiateEmailChangeUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        password_service: Arc<dyn PasswordHashingService>,
        cache_service: Arc<dyn CacheService>,
        email_service: Arc<dyn EmailService>,
    ) -> Self {
        Self {
            repo,
            password_service,
            cache_service,
            email_service,
        }
    }

    pub async fn execute(
        &self,
        id: Uuid,
        req: InitiateEmailChangeRequest,
    ) -> Result<(), AppError> {
        let admin = self
            .repo
            .find_by_id(id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;

        // 1. Verify current password
        let is_valid = self
            .password_service
            .verify_password(&req.current_password, &admin.password_hash)
            .map_err(AppError::InternalServerError)?;

        if !is_valid {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "currentPassword",
                "Incorrect current password",
            )]));
        }

        // 2. Check if new email is already in use
        if let Some(existing) = self
            .repo
            .find_by_email(&req.new_email)
            .await
            .map_err(AppError::InternalServerError)?
        {
            if existing.id != id {
                return Err(AppError::ValidationError(vec![FieldError::new(
                    "newEmail",
                    "Email is already in use",
                )]));
            }
        }

        // 3. Generate 6-digit OTP and Cancel Token
        let otp: String = rand::rng().random_range(100_000..999_999).to_string();
        let cancel_token = Uuid::new_v4().to_string();

        let pending = PendingEmailChange {
            new_email: req.new_email.clone(),
            otp: otp.clone(),
            cancel_token: cancel_token.clone(),
        };

        // 4. Store in cache (15 minutes)
        let key = format!("admin_email_change:pending:{}", id);
        let pending_json = serde_json::to_string(&pending).map_err(|e| AppError::InternalServerError(e.into()))?;
        self.cache_service.set(&key, pending_json, 900).await.map_err(AppError::InternalServerError)?;
        
        // Also map cancel_token to user_id for public cancel endpoint
        let cancel_key = format!("admin_email_change:cancel:{}", cancel_token);
        self.cache_service.set(&cancel_key, id.to_string(), 900).await.map_err(AppError::InternalServerError)?;

        // 5. Send emails
        // To new email (Verification)
        self.email_service.send_templated_email(
            &req.new_email,
            "Verify your new email address",
            "Email Change Request",
            &format!("<p>Your verification code is: <strong style='font-size: 24px; letter-spacing: 4px;'>{}</strong></p><p>This code will expire in 15 minutes.</p>", otp),
            None,
            None,
        ).await.map_err(AppError::InternalServerError)?;

        // To old email (Security Alert)
        let base_url = std::env::var("ADMIN_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
        let cancel_link = format!("{}/auth/cancel-email-change?token={}", base_url, cancel_token);
        
        self.email_service.send_templated_email(
            &admin.email,
            "Security Alert: Email change requested",
            "Security Alert",
            &format!(
                "<p>A request was made to change the email address associated with your account to {}.</p>\
                 <p>If you did not make this request, please click the link below to cancel it immediately:</p>\
                 <p><a href=\"{}\">Cancel Request</a></p>",
                req.new_email, cancel_link
            ),
            None,
            None,
        ).await.map_err(AppError::InternalServerError)?;

        Ok(())
    }
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VerifyEmailChangeRequest {
    #[validate(length(min = 6, max = 6, message = "OTP must be 6 digits"))]
    pub otp: String,
}

pub struct VerifyEmailChangeUseCase {
    repo: Arc<dyn AdministratorRepository>,
    cache_service: Arc<dyn CacheService>,
    email_service: Arc<dyn EmailService>,
}

impl VerifyEmailChangeUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        cache_service: Arc<dyn CacheService>,
        email_service: Arc<dyn EmailService>,
    ) -> Self {
        Self {
            repo,
            cache_service,
            email_service,
        }
    }

    pub async fn execute(
        &self,
        id: Uuid,
        req: VerifyEmailChangeRequest,
    ) -> Result<(), AppError> {
        let key = format!("admin_email_change:pending:{}", id);
        let pending_json = self.cache_service.get(&key).await.map_err(AppError::InternalServerError)?;
        
        let pending: PendingEmailChange = match pending_json {
            Some(json) => serde_json::from_str(&json).map_err(|e| AppError::InternalServerError(e.into()))?,
            None => return Err(AppError::BadRequest("No pending email change request found or it has expired".to_string())),
        };

        if req.otp != pending.otp {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "otp",
                "Invalid verification code",
            )]));
        }

        let admin = self
            .repo
            .find_by_id(id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;
            
        let old_email = admin.email.clone();

        // Update email
        let update_struct = UpdateAdministrator {
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            contact_number: None,
            email: Some(pending.new_email.clone()),
            password_hash: None,
            email_verified_at: None, // Or Some(OffsetDateTime::now_utc())
            revoked_at: None,
        };

        self.repo.update(id, update_struct).await.map_err(AppError::InternalServerError)?;

        // Clear cache
        let _ = self.cache_service.delete(&key).await;
        let cancel_key = format!("admin_email_change:cancel:{}", pending.cancel_token);
        let _ = self.cache_service.delete(&cancel_key).await;

        // Final Confirmations
        let success_msg = "<p>Your email address has been successfully updated.</p>";
        let _ = self.email_service.send_templated_email(
            &pending.new_email, "Email Address Updated", "Update Successful", success_msg, None, None
        ).await;
        let _ = self.email_service.send_templated_email(
            &old_email, "Email Address Updated", "Update Successful", success_msg, None, None
        ).await;

        Ok(())
    }
}

pub struct CancelEmailChangeUseCase {
    cache_service: Arc<dyn CacheService>,
}

impl CancelEmailChangeUseCase {
    pub fn new(cache_service: Arc<dyn CacheService>) -> Self {
        Self { cache_service }
    }

    pub async fn execute(&self, token: &str) -> Result<(), AppError> {
        let cancel_key = format!("admin_email_change:cancel:{}", token);
        let user_id_str = self.cache_service.get(&cancel_key).await.map_err(AppError::InternalServerError)?;
        
        if let Some(user_id) = user_id_str {
            // Delete both keys
            let _ = self.cache_service.delete(&cancel_key).await;
            let pending_key = format!("admin_email_change:pending:{}", user_id);
            let _ = self.cache_service.delete(&pending_key).await;
        } else {
            return Err(AppError::BadRequest("Invalid or expired cancel token".to_string()));
        }

        Ok(())
    }
}
