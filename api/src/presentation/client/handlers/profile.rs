use crate::application::auth::registration::onboarding::{
    CompleteOnboardingUseCase, OnboardingRequest,
};
use crate::application::users::get::GetUserUseCase;
use crate::infrastructure::repositories::users::PostgresUserRepository;
use crate::infrastructure::state::AppState;
use crate::presentation::dtos::UserResource;
use crate::presentation::extractors::AuthUser;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::response::{JsonApiResource, JsonApiResponse};
use crate::shared::validation::ValidatedJson;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use std::sync::Arc;

/// Complete onboarding handler
#[utoipa::path(
    patch,
    path = "/api/v1/profile/onboarding",
    request_body = OnboardingRequest,
    responses(
        (status = 200, description = "Onboarding successful", body = JsonApiResponse<JsonApiResource<UserResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Client / Profile"
)]
pub async fn complete_onboarding(
    State(state): State<AppState>,
    AuthUser { claims }: AuthUser,
    ValidatedJson(req): ValidatedJson<OnboardingRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = claims
        .user_id()
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;
    let user_repo = Arc::new(PostgresUserRepository::new(state.pool.clone()));
    let use_case = CompleteOnboardingUseCase::new(user_repo);

    let user = use_case.execute(user_id, req).await?;
    let resource = JsonApiResource::new(
        "users",
        user.id.to_string(),
        UserResource::from_user(user, &*state.storage_service).await,
    );

    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

use crate::application::users::update::{UpdateUserRequest, UpdateUserUseCase};

/// Update profile handler
#[utoipa::path(
    patch,
    path = "/api/v1/profile",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "Profile updated successful", body = JsonApiResponse<JsonApiResource<UserResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Client / Profile"
)]
pub async fn update_profile(
    State(state): State<AppState>,
    AuthUser { claims }: AuthUser,
    ValidatedJson(req): ValidatedJson<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_id = claims
        .user_id()
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;
    let user_repo = Arc::new(PostgresUserRepository::new(state.pool.clone()));
    let password_service = Arc::new(crate::infrastructure::password::PasswordService::new());
    let use_case =
        UpdateUserUseCase::new(user_repo, password_service, state.storage_service.clone());

    let user = use_case.execute(user_id, req).await?;
    let resource = JsonApiResource::new(
        "users",
        user.id.to_string(),
        UserResource::from_user(user, &*state.storage_service).await,
    );

    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

/// Get my profile handler
#[utoipa::path(
    get,
    path = "/api/v1/my/profile",
    responses(
        (status = 200, description = "Profile retrieved", body = JsonApiResponse<JsonApiResource<UserResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Client / Profile"
)]
pub async fn get_profile(
    State(state): State<AppState>,
    AuthUser { claims }: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let user_id = claims
        .user_id()
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;
    let user_repo = Arc::new(PostgresUserRepository::new(state.pool.clone()));
    let use_case = GetUserUseCase::new(user_repo);

    let user = use_case.execute(user_id).await?;

    match user {
        Some(user) => {
            let resource = JsonApiResource::new(
                "users",
                user.id.to_string(),
                UserResource::from_user(user, &*state.storage_service).await,
            );
            Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
        }
        None => Err(AppError::NotFound(format!(
            "User with id {} not found",
            user_id
        ))),
    }
}

use crate::application::users::email_change::{
    InitiateUserEmailChangeRequest, InitiateUserEmailChangeUseCase, VerifyUserEmailChangeRequest,
    VerifyUserEmailChangeUseCase,
};

/// Initiate email change
#[utoipa::path(
    post,
    path = "/api/v1/profile/email/initiate",
    request_body = InitiateUserEmailChangeRequest,
    responses(
        (status = 204, description = "Email change initiated successfully"),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Client / Profile"
)]
pub async fn initiate_email_change(
    State(state): State<AppState>,
    AuthUser { claims }: AuthUser,
    ValidatedJson(req): ValidatedJson<InitiateUserEmailChangeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresUserRepository::new(state.pool));
    let password_service = Arc::new(crate::infrastructure::password::PasswordService::new());
    let use_case = InitiateUserEmailChangeUseCase::new(
        repo,
        password_service,
        state.cache_service,
        state.email_service,
    );

    let user_id = claims
        .user_id()
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;
    use_case.execute(user_id, req).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Verify email change
#[utoipa::path(
    post,
    path = "/api/v1/profile/email/verify",
    request_body = VerifyUserEmailChangeRequest,
    responses(
        (status = 200, description = "Email updated successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Client / Profile"
)]
pub async fn verify_email_change(
    State(state): State<AppState>,
    AuthUser { claims }: AuthUser,
    ValidatedJson(req): ValidatedJson<VerifyUserEmailChangeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresUserRepository::new(state.pool));
    let use_case =
        VerifyUserEmailChangeUseCase::new(repo, state.cache_service, state.email_service);

    let user_id = claims
        .user_id()
        .map_err(|e| AppError::Unauthorized(e.to_string()))?;
    use_case.execute(user_id, req).await?;
    Ok((
        StatusCode::OK,
        Json(JsonApiResponse::new(serde_json::json!({ "success": true }))),
    ))
}
