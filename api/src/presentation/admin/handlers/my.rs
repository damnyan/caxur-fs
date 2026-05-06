use crate::application::administrators::get::GetAdministratorUseCase;
use crate::application::administrators::update_my_profile::{UpdateMyProfileRequest, UpdateMyProfileUseCase};
use crate::application::administrators::update_my_password::{UpdateMyPasswordRequest, UpdateMyPasswordUseCase};
use crate::infrastructure::db::DbPool;
use crate::infrastructure::password::PasswordService;
use crate::infrastructure::repositories::administrators::PostgresAdministratorRepository;
use crate::presentation::admin::handlers::administrators::{build_admin_resource, AdministratorResource};
use crate::presentation::extractors::AuthUser;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::response::{JsonApiResponse, JsonApiResource};
use crate::shared::validation::ValidatedJson;
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;

/// Get current administrator profile
#[utoipa::path(
    get,
    path = "/api/v1/admin/my/profile",
    responses(
        (status = 200, description = "Current administrator found", body = JsonApiResponse<JsonApiResource<AdministratorResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / My Profile"
)]
pub async fn get_my_profile(
    State(pool): State<DbPool>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = GetAdministratorUseCase::new(repo);

    let user_id = uuid::Uuid::parse_str(&auth.claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let admin = use_case.execute(user_id).await?;

    match admin {
        Some(admin) => {
            let (resource, included) = build_admin_resource(admin, true);
            let mut response = JsonApiResponse::new(resource);
            if !included.is_empty() {
                response = response.with_included(included);
            }
            Ok((StatusCode::OK, Json(response)))
        }
        None => Err(AppError::Unauthorized("Administrator not found".to_string())),
    }
}

/// Update current administrator profile
#[utoipa::path(
    patch,
    path = "/api/v1/admin/my/profile",
    request_body = UpdateMyProfileRequest,
    responses(
        (status = 200, description = "Administrator profile updated successfully", body = JsonApiResponse<JsonApiResource<AdministratorResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / My Profile"
)]
pub async fn update_my_profile(
    State(pool): State<DbPool>,
    auth: AuthUser,
    ValidatedJson(req): ValidatedJson<UpdateMyProfileRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = UpdateMyProfileUseCase::new(repo);

    let user_id = uuid::Uuid::parse_str(&auth.claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    let admin = use_case.execute(user_id, req).await?;
    let (resource, _) = build_admin_resource(admin, true);
    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

/// Update current administrator password
#[utoipa::path(
    patch,
    path = "/api/v1/admin/my/profile/password",
    request_body = UpdateMyPasswordRequest,
    responses(
        (status = 200, description = "Administrator password updated successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / My Profile"
)]
pub async fn update_my_password(
    State(pool): State<DbPool>,
    auth: AuthUser,
    ValidatedJson(req): ValidatedJson<UpdateMyPasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let hasher = Arc::new(PasswordService::new());
    let use_case = UpdateMyPasswordUseCase::new(repo, hasher);

    let user_id = uuid::Uuid::parse_str(&auth.claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;
    use_case.execute(user_id, req).await?;
    Ok((StatusCode::OK, Json(JsonApiResponse::new(json!({ "success": true })))))
}
