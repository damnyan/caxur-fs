use crate::application::administrators::email_change::CancelEmailChangeUseCase;
use crate::application::administrators::password_reset::{
    ConfirmPasswordResetRequest, ConfirmPasswordResetUseCase, RequestPasswordResetRequest,
    RequestPasswordResetUseCase,
};
use crate::application::auth::admin_login::{AdminLoginRequest, AdminLoginUseCase};
use crate::application::auth::logout::{LogoutRequest, LogoutUseCase};
use crate::application::auth::refresh::{RefreshTokenRequest, RefreshTokenUseCase};
use crate::infrastructure::password::PasswordService;
use crate::infrastructure::repositories::administrators::PostgresAdministratorRepository;
use crate::infrastructure::repositories::refresh_tokens::PostgresRefreshTokenRepository;
use crate::infrastructure::state::AppState;
use crate::presentation::dtos::AuthTokenResource;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::response::{JsonApiResource, JsonApiResponse};
use crate::shared::validation::ValidatedJson;
use axum::{extract::State, http::StatusCode, response::IntoResponse};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use utoipa::ToSchema;
use validator::Validate;

/// Admin Login handler
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/login",
    request_body = AdminLoginRequest,
    responses(
        (status = 200, description = "Admin Login successful", body = JsonApiResponse<JsonApiResource<AuthTokenResource>>),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn admin_login(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<AdminLoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let auth_service = state.auth_service;
    let pool = state.pool;

    let admin_repo = Arc::new(PostgresAdministratorRepository::new(pool.clone()));
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(pool));
    let password_service = Arc::new(PasswordService::new());

    let access_token_expiry = std::env::var("JWT_ACCESS_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "900".to_string())
        .parse::<i64>()
        .unwrap_or(900);
    let refresh_token_expiry = std::env::var("JWT_REFRESH_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "604800".to_string())
        .parse::<i64>()
        .unwrap_or(604800);

    let use_case = AdminLoginUseCase::new(
        admin_repo,
        refresh_token_repo,
        auth_service,
        password_service,
        access_token_expiry,
        refresh_token_expiry,
    );

    let response = use_case.execute(req).await?;
    let resource =
        JsonApiResource::new("auth-tokens", "session", AuthTokenResource::from(response));

    Ok((StatusCode::OK, JsonApiResponse::new(resource)))
}

/// Admin Refresh token handler
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/refresh",
    request_body = RefreshTokenRequest,
    responses(
        (status = 200, description = "Token refreshed successfully", body = JsonApiResponse<JsonApiResource<AuthTokenResource>>),
        (status = 401, description = "Invalid refresh token", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn refresh_token(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<RefreshTokenRequest>,
) -> Result<impl IntoResponse, AppError> {
    let access_token_expiry = std::env::var("JWT_ACCESS_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "900".to_string())
        .parse::<i64>()
        .unwrap_or(900);
    let refresh_token_expiry = std::env::var("JWT_REFRESH_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "604800".to_string())
        .parse::<i64>()
        .unwrap_or(604800);

    let auth_service = state.auth_service;
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(state.pool));

    // Execute use case
    let use_case = RefreshTokenUseCase::new(
        refresh_token_repo,
        auth_service,
        access_token_expiry,
        refresh_token_expiry,
    );

    let response = use_case.execute(req).await?;
    let resource =
        JsonApiResource::new("auth-tokens", "session", AuthTokenResource::from(response));

    Ok((StatusCode::OK, JsonApiResponse::new(resource)))
}

/// Admin Logout handler
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/logout",
    request_body = LogoutRequest,
    responses(
        (status = 204, description = "Logout successful"),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn admin_logout(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<LogoutRequest>,
) -> Result<impl IntoResponse, AppError> {
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(state.pool));

    // Execute use case
    let use_case = LogoutUseCase::new(refresh_token_repo);
    use_case.execute(req).await?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CancelEmailChangeRequest {
    #[validate(length(min = 1, message = "Token is required"))]
    pub token: String,
}

/// Cancel admin email change request
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/email/cancel",
    request_body = CancelEmailChangeRequest,
    responses(
        (status = 200, description = "Email change cancelled successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 400, description = "Bad request / Invalid token", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn cancel_email_change(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CancelEmailChangeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let use_case = CancelEmailChangeUseCase::new(state.cache_service);

    use_case.execute(&req.token).await?;

    Ok((
        StatusCode::OK,
        JsonApiResponse::new(json!({ "success": true })),
    ))
}

/// Request password reset
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/forgot-password",
    request_body = RequestPasswordResetRequest,
    responses(
        (status = 200, description = "If email exists, a reset link will be sent", body = JsonApiResponse<serde_json::Value>),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<RequestPasswordResetRequest>,
) -> Result<impl IntoResponse, AppError> {
    let admin_repo = Arc::new(PostgresAdministratorRepository::new(state.pool.clone()));
    let use_case =
        RequestPasswordResetUseCase::new(admin_repo, state.cache_service, state.email_service);

    use_case.execute(req).await?;

    Ok((
        StatusCode::OK,
        JsonApiResponse::new(
            json!({ "message": "If an account with that email exists, we have sent a reset link." }),
        ),
    ))
}

/// Confirm password reset
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/reset-password",
    request_body = ConfirmPasswordResetRequest,
    responses(
        (status = 200, description = "Password reset successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 400, description = "Invalid or expired token", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn reset_password(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<ConfirmPasswordResetRequest>,
) -> Result<impl IntoResponse, AppError> {
    let admin_repo = Arc::new(PostgresAdministratorRepository::new(state.pool.clone()));
    let password_service = Arc::new(PasswordService::new());

    let use_case =
        ConfirmPasswordResetUseCase::new(admin_repo, state.cache_service, password_service);

    use_case.execute(req).await?;

    Ok((
        StatusCode::OK,
        JsonApiResponse::new(json!({ "success": true })),
    ))
}
