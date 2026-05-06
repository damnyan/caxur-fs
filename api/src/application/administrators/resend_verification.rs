use crate::domain::administrators::AdministratorRepository;
use crate::domain::auth::AuthService;
use crate::infrastructure::email::EmailService;
use crate::shared::error::AppError;
use std::sync::Arc;
use uuid::Uuid;

pub struct ResendVerificationUseCase {
    repo: Arc<dyn AdministratorRepository>,
    auth_service: Arc<dyn AuthService>,
    email_service: Arc<dyn EmailService>,
    admin_url: String,
}

impl ResendVerificationUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        auth_service: Arc<dyn AuthService>,
        email_service: Arc<dyn EmailService>,
        admin_url: String,
    ) -> Self {
        Self {
            repo,
            auth_service,
            email_service,
            admin_url,
        }
    }

    pub async fn execute(&self, id: Uuid) -> Result<(), AppError> {
        let admin = self
            .repo
            .find_by_id(id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;

        if admin.email_verified_at.is_some() {
            return Err(AppError::BadRequest("Email is already verified".to_string()));
        }

        let token = self
            .auth_service
            .generate_verification_token(admin.id, "admin".to_string())
            .map_err(AppError::InternalServerError)?;

        let set_password_link = format!("{}/set-password?token={}", self.admin_url, token);

        let email_body = format!(
            "Hello {},<br><br>Please click the link below to verify your email and set your password:<br><br><a href=\"{}\">{}</a>",
            admin.first_name, set_password_link, set_password_link
        );

        self.email_service
            .send_email(
                &admin.email,
                "Caxur Admin - Verify Email and Set Password",
                &email_body,
            )
            .await
            .map_err(|e| {
                tracing::error!("Failed to resend verification email: {:?}", e);
                AppError::InternalServerError(anyhow::anyhow!("Failed to send email"))
            })?;

        Ok(())
    }
}
