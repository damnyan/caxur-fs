use crate::domain::users::{UpdateUser, User, UserRepository};
use crate::shared::error::AppError;
use crate::shared::validation::flatten_validation_errors;
use serde::Deserialize;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingRequest {
    #[validate(length(min = 1, message = "First name is required"))]
    pub first_name: String,
    pub middle_name: Option<String>,
    #[validate(length(min = 1, message = "Last name is required"))]
    pub last_name: String,
    pub suffix: Option<String>,
}

pub struct CompleteOnboardingUseCase {
    user_repository: Arc<dyn UserRepository>,
}

impl CompleteOnboardingUseCase {
    pub fn new(user_repository: Arc<dyn UserRepository>) -> Self {
        Self { user_repository }
    }

    pub async fn execute(&self, user_id: Uuid, request: OnboardingRequest) -> Result<User, AppError> {
        request.validate().map_err(|e| AppError::ValidationError(flatten_validation_errors(e)))?;

        let update = UpdateUser {
            email: None,
            password_hash: None,
            first_name: Some(request.first_name),
            middle_name: request.middle_name,
            last_name: Some(request.last_name),
            suffix: request.suffix,
        };

        self.user_repository
            .update(user_id, update)
            .await
            .map_err(AppError::InternalServerError)
    }
}
