use crate::application::auth::admin_login::{AdminLoginRequest, AdminLoginUseCase};
use crate::infrastructure::repositories::administrators::PostgresAdministratorRepository;
use crate::infrastructure::repositories::refresh_tokens::PostgresRefreshTokenRepository;
use crate::infrastructure::state::AppState;
use crate::presentation::dtos::AuthTokenResource;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::response::{JsonApiResource, JsonApiResponse};
use crate::shared::validation::ValidatedJson;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use std::sync::Arc;

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
    let password_service = Arc::new(crate::infrastructure::password::PasswordService::new());

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

    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

/// Admin Refresh token handler
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/refresh",
    request_body = crate::application::auth::refresh::RefreshTokenRequest,
    responses(
        (status = 200, description = "Token refreshed successfully", body = JsonApiResponse<JsonApiResource<AuthTokenResource>>),
        (status = 401, description = "Invalid refresh token", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn refresh_token(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<crate::application::auth::refresh::RefreshTokenRequest>,
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
    let use_case = crate::application::auth::refresh::RefreshTokenUseCase::new(
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

/// Admin Logout handler
#[utoipa::path(
    post,
    path = "/api/v1/admin/auth/logout",
    request_body = crate::application::auth::logout::LogoutRequest,
    responses(
        (status = 204, description = "Logout successful"),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Auth"
)]
pub async fn admin_logout(
    State(state): State<AppState>,
    ValidatedJson(req): ValidatedJson<crate::application::auth::logout::LogoutRequest>,
) -> Result<impl IntoResponse, AppError> {
    let refresh_token_repo = Arc::new(PostgresRefreshTokenRepository::new(state.pool));

    // Execute use case
    let use_case = crate::application::auth::logout::LogoutUseCase::new(refresh_token_repo);
    use_case.execute(req).await?;

    Ok(StatusCode::NO_CONTENT)
}
