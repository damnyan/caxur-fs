use crate::application::auth::token_utils::hash_token;
use crate::domain::auth::RefreshTokenRepository;
use crate::shared::error::AppError;
use serde::Deserialize;
use std::sync::Arc;
use validator::Validate;

#[derive(Debug, Deserialize, Validate, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct LogoutRequest {
    #[validate(length(min = 1, message = "Refresh token is required"))]
    pub refresh_token: String,
}

pub struct LogoutUseCase {
    refresh_token_repo: Arc<dyn RefreshTokenRepository>,
}

impl LogoutUseCase {
    pub fn new(refresh_token_repo: Arc<dyn RefreshTokenRepository>) -> Self {
        Self { refresh_token_repo }
    }

    pub async fn execute(&self, req: LogoutRequest) -> Result<(), AppError> {
        // Hash the refresh token to find it in the database
        let token_hash = hash_token(&req.refresh_token);

        // Delete the refresh token
        self.refresh_token_repo
            .delete_by_hash(&token_hash)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(())
    }
}
