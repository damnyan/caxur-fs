use crate::domain::administrators::{Administrator, AdministratorRepository, NewAdministrator};
use crate::domain::auth::AuthService;
use crate::domain::email::EmailService;
use crate::domain::password::PasswordHashingService;
use crate::shared::error::{AppError, FieldError};
use serde::Deserialize;
use std::env;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreateAdministratorRequest {
    #[validate(length(min = 1))]
    pub first_name: String,
    pub middle_name: Option<String>,
    #[validate(length(min = 1))]
    pub last_name: String,
    pub suffix: Option<String>,
    pub contact_number: Option<String>,
    #[serde(deserialize_with = "crate::shared::validation::deserialize_email")]
    #[validate(email)]
    pub email: String,
}

impl CreateAdministratorRequest {
    /// Custom async validation to check if email already exists
    pub async fn validate_unique_email(
        &self,
        repo: &dyn AdministratorRepository,
    ) -> Result<(), AppError> {
        if repo.find_by_email(&self.email).await?.is_some() {
            return Err(AppError::ValidationError(vec![FieldError::new(
                "email",
                "Email already exists",
            )]));
        }
        Ok(())
    }
}

pub struct CreateAdministratorUseCase {
    repo: Arc<dyn AdministratorRepository>,
    password_service: Arc<dyn PasswordHashingService>,
    auth_service: Arc<dyn AuthService>,
    email_service: Arc<dyn EmailService>,
    admin_url: String,
}

impl CreateAdministratorUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        password_service: Arc<dyn PasswordHashingService>,
        auth_service: Arc<dyn AuthService>,
        email_service: Arc<dyn EmailService>,
        admin_url: String,
    ) -> Self {
        Self {
            repo,
            password_service,
            auth_service,
            email_service,
            admin_url,
        }
    }

    #[tracing::instrument(skip(self, req))]
    pub async fn execute(
        &self,
        req: CreateAdministratorRequest,
    ) -> Result<Administrator, AppError> {
        // Check if email already exists
        req.validate_unique_email(self.repo.as_ref()).await?;

        let random_password = Uuid::new_v4().to_string();
        let password_hash = self
            .password_service
            .hash_password(&random_password)
            .await
            .map_err(AppError::InternalServerError)?;

        let new_admin = NewAdministrator {
            first_name: req.first_name,
            middle_name: req.middle_name,
            last_name: req.last_name,
            suffix: req.suffix,
            contact_number: req.contact_number,
            email: req.email.clone(),
            password_hash,
        };

        let admin = self
            .repo
            .create(new_admin)
            .await
            .map_err(AppError::InternalServerError)?;

        let token = self
            .auth_service
            .generate_verification_token(admin.id, "admin".to_string())
            .map_err(AppError::InternalServerError)?;

        let set_password_link = format!("{}/set-password?token={}", self.admin_url, token);

        let app_name = env::var("APP_NAME").unwrap_or_else(|_| "Application".to_string());
        let email_subject = format!("Welcome to {} Admin - Set Your Password", app_name);
        let email_title = "Welcome to the Team!";
        let email_content = format!(
            "<p>Hello {} {},</p><p>Your administrator account has been created. To get started, please verify your email and set your password by clicking the button below.</p>",
            admin.first_name, admin.last_name
        );

        if let Err(e) = self
            .email_service
            .send_templated_email(
                &admin.email,
                &email_subject,
                email_title,
                &email_content,
                Some("Set My Password"),
                Some(&set_password_link),
            )
            .await
        {
            tracing::error!("Failed to send verification email: {:?}", e);
        }

        Ok(admin)
    }
}
