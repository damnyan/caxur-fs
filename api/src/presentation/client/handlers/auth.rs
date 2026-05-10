use crate::application::auth::login::{LoginRequest, LoginUseCase};
use crate::application::auth::refresh::{RefreshTokenRequest, RefreshTokenUseCase};
use crate::application::auth::registration::initiate::{InitiateRegistrationRequest, InitiateRegistrationUseCase};
use crate::application::auth::registration::verify::{VerifyRegistrationRequest, VerifyRegistrationUseCase};
use crate::infrastructure::repositories::refresh_tokens::PostgresRefreshTokenRepository;
use crate::infrastructure::repositories::users::PostgresUserRepository;
use crate::infrastructure::state::AppState;
use crate::presentation::dtos::AuthTokenResource;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::response::{JsonApiResource, JsonApiResponse};
use crate::shared::validation::ValidatedJson;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use std::sync::Arc;

/// Login handler
#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = JsonApiResponse<JsonApiResource<AuthTokenResource>>),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Client / Auth"
)]
pub async fn login(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    let auth_service = state.auth_service;
    let pool = state.pool;

    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(pool));
    let password_service = Arc::new(crate::infrastructure::password::PasswordService::new());

    let access_token_expiry = std::env::var("JWT_ACCESS_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "900".to_string())
        .parse::<i64>()
        .unwrap_or(900);
    let refresh_token_expiry = std::env::var("JWT_REFRESH_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "604800".to_string())
        .parse::<i64>()
        .unwrap_or(604800);

    let use_case = LoginUseCase::new(
        user_repo,
        refresh_token_repo,
        auth_service,
        password_service,
        access_token_expiry,
        refresh_token_expiry,
    );

    let (response, user) = use_case.execute(req).await?;
    let resource =
        JsonApiResource::new("auth-tokens", "session", AuthTokenResource::new(response, Some(user)));

    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

/// Refresh token handler
#[utoipa::path(
    post,
    path = "/api/v1/auth/refresh",
    request_body = RefreshTokenRequest,
    responses(
        (status = 200, description = "Token refreshed successfully", body = JsonApiResponse<JsonApiResource<AuthTokenResource>>),
        (status = 401, description = "Invalid refresh token", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Client / Auth"
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

    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

/// Logout handler
#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    request_body = crate::application::auth::logout::LogoutRequest,
    responses(
        (status = 204, description = "Logout successful"),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Client / Auth"
)]
pub async fn logout(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<crate::application::auth::logout::LogoutRequest>,
) -> Result<impl IntoResponse, AppError> {
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(state.pool));

    // Execute use case
    let use_case = crate::application::auth::logout::LogoutUseCase::new(refresh_token_repo);
    use_case.execute(req).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Initiate registration handler
#[utoipa::path(
    post,
    path = "/api/v1/auth/register/initiate",
    request_body = InitiateRegistrationRequest,
    responses(
        (status = 204, description = "Registration initiated, OTP sent"),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Client / Auth"
)]
pub async fn register_initiate(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<InitiateRegistrationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_repo = Arc::new(PostgresUserRepository::new(state.pool.clone()));
    let cache_service = state.cache_service.clone();
    let email_service = state.email_service.clone();
    let password_service = Arc::new(crate::infrastructure::password::PasswordService::new());

    let use_case = InitiateRegistrationUseCase::new(
        user_repo,
        cache_service,
        email_service,
        password_service,
    );

    use_case.execute(req).await.map_err(|e| AppError::BadRequest(e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// Verify registration handler
#[utoipa::path(
    post,
    path = "/api/v1/auth/register/verify",
    request_body = VerifyRegistrationRequest,
    responses(
        (status = 200, description = "Registration successful", body = JsonApiResponse<JsonApiResource<AuthTokenResource>>),
        (status = 400, description = "Invalid OTP or session expired", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Client / Auth"
)]
pub async fn register_verify(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<VerifyRegistrationRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_repo = Arc::new(PostgresUserRepository::new(state.pool.clone()));
    let cache_service = state.cache_service.clone();
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(state.pool.clone()));
    let auth_service = state.auth_service.clone();

    let access_token_expiry = std::env::var("JWT_ACCESS_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "900".to_string())
        .parse::<i64>()
        .unwrap_or(900);
    let refresh_token_expiry = std::env::var("JWT_REFRESH_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "604800".to_string())
        .parse::<i64>()
        .unwrap_or(604800);

    let use_case = VerifyRegistrationUseCase::new(
        user_repo,
        cache_service,
        refresh_token_repo,
        auth_service,
        access_token_expiry,
        refresh_token_expiry,
    );

    let (response, user) = use_case.execute(req).await?;
    let resource = JsonApiResource::new("auth-tokens", "session", AuthTokenResource::new(response, Some(user)));

    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

use crate::application::users::email_change::CancelUserEmailChangeUseCase;

#[derive(Debug, serde::Deserialize, validator::Validate, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CancelUserEmailChangeRequest {
    #[validate(length(min = 1, message = "Token is required"))]
    pub token: String,
}

/// Cancel client email change request
#[utoipa::path(
    post,
    path = "/api/v1/auth/email/cancel",
    request_body = CancelUserEmailChangeRequest,
    responses(
        (status = 200, description = "Email change cancelled successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 400, description = "Bad request / Invalid token", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Client / Auth"
)]
pub async fn cancel_email_change(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<CancelUserEmailChangeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let use_case = CancelUserEmailChangeUseCase::new(
        state.cache_service,
    );

    use_case.execute(&req.token).await?;

    Ok((StatusCode::OK, Json(JsonApiResponse::new(serde_json::json!({ "success": true })))))
}
