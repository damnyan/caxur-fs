use crate::application::roles::attach_permission::AttachPermissionUseCase;
use crate::application::roles::create::{CreateRoleRequest, CreateRoleUseCase};
use crate::application::roles::delete::DeleteRoleUseCase;
use crate::application::roles::detach_permission::DetachPermissionUseCase;
use crate::application::roles::get::GetRoleUseCase;
use crate::application::roles::get_permissions::GetRolePermissionsUseCase;
use crate::application::roles::list::ListRolesUseCase;
use crate::application::roles::update::{UpdateRoleRequest, UpdateRoleUseCase};
use crate::domain::access_scope::AccessScope;
use crate::domain::permissions::Permission;
use crate::domain::roles::{Role, RoleRepository};
use crate::infrastructure::db::DbPool;
use crate::infrastructure::repositories::roles::PostgresRoleRepository;
use crate::infrastructure::state::AppState;
use crate::presentation::dtos::PermissionDto;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::pagination::{PageParams, PaginationLinkBuilder};
use crate::shared::query::Qs;
use crate::shared::response::{JsonApiMeta, JsonApiResource, JsonApiResponse};
use crate::shared::validation::ValidatedJson;
use axum::{
    Extension,
    extract::{Path, State},
    http::{StatusCode, Uri},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use time::OffsetDateTime;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;
use validator::Validate;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RoleResource {
    pub name: String,
    pub description: Option<String>,
    #[serde(with = "time::serde::iso8601")]
    #[schema(value_type = String)]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::iso8601")]
    #[schema(value_type = String)]
    pub updated_at: OffsetDateTime,
}

impl From<Role> for RoleResource {
    fn from(role: Role) -> Self {
        Self {
            name: role.name,
            description: role.description,
            created_at: role.created_at,
            updated_at: role.updated_at,
        }
    }
}

#[derive(Deserialize, IntoParams, ToSchema)]
#[serde(rename_all = "camelCase")]
#[into_params(parameter_in = Query)]
pub struct ListRolesQuery {
    /// Pagination parameters
    #[serde(default)]
    #[param(inline, style = DeepObject, explode = true)]
    pub page: PageParams,
}

/// Create a new role
#[utoipa::path(
    post,
    path = "/api/v1/admin/roles",
    request_body = CreateRoleRequest,
    responses(
        (status = 201, description = "Role created successfully", body = JsonApiResponse<JsonApiResource<RoleResource>>),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn create_role(
    State(pool): State<DbPool>,
    Extension(permissions): Extension<Vec<Permission>>,
    ValidatedJson(req): ValidatedJson<CreateRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_role_management(&permissions)?;

    let repo = Arc::new(PostgresRoleRepository::new(pool));
    let use_case = CreateRoleUseCase::new(repo);

    let role = use_case.execute(req).await?;
    let resource = JsonApiResource::new("roles", role.id.to_string(), RoleResource::from(role));

    Ok((StatusCode::CREATED, JsonApiResponse::new(resource)))
}

/// Get a role by ID
#[utoipa::path(
    get,
    path = "/api/v1/admin/roles/{id}",
    params(
        ("id" = Uuid, Path, description = "Role ID")
    ),
    responses(
        (status = 200, description = "Role found", body = JsonApiResponse<JsonApiResource<RoleResource>>),
        (status = 404, description = "Role not found", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn get_role(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresRoleRepository::new(pool));
    let use_case = GetRoleUseCase::new(repo);

    let role = use_case.execute(id).await?;
    let resource = JsonApiResource::new("roles", role.id.to_string(), RoleResource::from(role));

    Ok((StatusCode::OK, JsonApiResponse::new(resource)))
}

/// List all roles with pagination
#[utoipa::path(
    get,
    path = "/api/v1/admin/roles",
    params(ListRolesQuery),
    responses(
        (status = 200, description = "List of roles", body = JsonApiResponse<Vec<JsonApiResource<RoleResource>>>),
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn list_roles(
    State(pool): State<DbPool>,
    uri: Uri,
    Qs(query): Qs<ListRolesQuery>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresRoleRepository::new(pool));
    let use_case = ListRolesUseCase::new(repo.clone());

    let page_number = query.page.number;
    let page_size = query.page.size;

    let roles = use_case
        .execute(AccessScope::Administrator, None, page_size, page_number)
        .await?;

    let total = repo.count().await.map_err(AppError::InternalServerError)?;

    let resources: Vec<JsonApiResource<RoleResource>> = roles
        .into_iter()
        .map(|role| JsonApiResource::new("roles", role.id.to_string(), RoleResource::from(role)))
        .collect();

    let meta = JsonApiMeta::new()
        .with_page(page_number)
        .with_per_page(page_size)
        .with_total(total);

    let links = PaginationLinkBuilder::from_uri(&uri, page_number, page_size, total).build();

    Ok((
        StatusCode::OK,
        JsonApiResponse::new(resources)
            .with_meta(meta)
            .with_links(links),
    ))
}

/// Update a role
#[utoipa::path(
    put,
    path = "/api/v1/admin/roles/{id}",
    params(
        ("id" = Uuid, Path, description = "Role ID")
    ),
    request_body = UpdateRoleRequest,
    responses(
        (status = 200, description = "Role updated successfully", body = JsonApiResponse<JsonApiResource<RoleResource>>),
        (status = 404, description = "Role not found", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn update_role(
    State(state): State<AppState>,
    Extension(permissions): Extension<Vec<Permission>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<UpdateRoleRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_role_management(&permissions)?;

    let repo = Arc::new(PostgresRoleRepository::new(state.pool));
    let use_case = UpdateRoleUseCase::new(repo);

    let role = use_case.execute(id, req).await?;
    state.admin_permissions_cache.invalidate_all();
    let resource = JsonApiResource::new("roles", role.id.to_string(), RoleResource::from(role));

    Ok((StatusCode::OK, JsonApiResponse::new(resource)))
}

/// Delete a role
#[utoipa::path(
    delete,
    path = "/api/v1/admin/roles/{id}",
    params(
        ("id" = Uuid, Path, description = "Role ID")
    ),
    responses(
        (status = 200, description = "Role deleted successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 404, description = "Role not found", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn delete_role(
    State(state): State<AppState>,
    Extension(permissions): Extension<Vec<Permission>>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    require_role_management(&permissions)?;

    let repo = Arc::new(PostgresRoleRepository::new(state.pool));
    let use_case = DeleteRoleUseCase::new(repo);

    use_case.execute(id).await?;
    state.admin_permissions_cache.invalidate_all();

    let meta = JsonApiMeta::new().with_extra(json!({ "deleted": true }));
    Ok((
        StatusCode::OK,
        JsonApiResponse::new(json!(null)).with_meta(meta),
    ))
}

/// Attach a permission to a role
#[utoipa::path(
    post,
    path = "/api/v1/admin/roles/{id}/permissions",
    params(
        ("id" = Uuid, Path, description = "Role ID")
    ),
    request_body = AttachPermissionRequest,
    responses(
        (status = 200, description = "Permission attached successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 404, description = "Role not found", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn attach_permission(
    State(state): State<AppState>,
    Extension(permissions): Extension<Vec<Permission>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<AttachPermissionRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_role_management(&permissions)?;

    let repo = Arc::new(PostgresRoleRepository::new(state.pool));
    let use_case = AttachPermissionUseCase::new(repo);

    let permissions: Vec<Permission> = req.permissions.into_iter().map(|p| p.into()).collect();
    use_case.execute(id, permissions).await?;
    state.admin_permissions_cache.invalidate_all();

    let meta = JsonApiMeta::new().with_extra(json!({ "attached": true }));
    Ok((
        StatusCode::OK,
        JsonApiResponse::new(json!(null)).with_meta(meta),
    ))
}

/// Detach permissions from a role
#[utoipa::path(
    delete,
    path = "/api/v1/admin/roles/{id}/permissions",
    params(
        ("id" = Uuid, Path, description = "Role ID")
    ),
    request_body = DetachPermissionRequest,
    responses(
        (status = 200, description = "Permissions detached successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 404, description = "Role not found", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn detach_permission(
    State(state): State<AppState>,
    Extension(permissions): Extension<Vec<Permission>>,
    Path(id): Path<Uuid>,
    ValidatedJson(req): ValidatedJson<DetachPermissionRequest>,
) -> Result<impl IntoResponse, AppError> {
    require_role_management(&permissions)?;

    let repo = Arc::new(PostgresRoleRepository::new(state.pool));
    let use_case = DetachPermissionUseCase::new(repo);

    let permissions: Vec<Permission> = req.permissions.into_iter().map(|p| p.into()).collect();
    use_case.execute(id, permissions).await?;
    state.admin_permissions_cache.invalidate_all();

    let meta = JsonApiMeta::new().with_extra(json!({ "detached": true }));
    Ok((
        StatusCode::OK,
        JsonApiResponse::new(json!(null)).with_meta(meta),
    ))
}

#[derive(Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AttachPermissionRequest {
    #[schema(example = json!(["administrator_management"]))]
    pub permissions: Vec<PermissionDto>,
}

#[derive(Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DetachPermissionRequest {
    #[schema(example = json!(["administrator_management"]))]
    pub permissions: Vec<PermissionDto>,
}

/// Get all permissions for a role
#[utoipa::path(
    get,
    path = "/api/v1/admin/roles/{id}/permissions",
    params(
        ("id" = Uuid, Path, description = "Role ID")
    ),
    responses(
        (status = 200, description = "List of permissions", body = JsonApiResponse<Vec<PermissionDto>>),
        (status = 404, description = "Role not found", body = ErrorResponse)
    ),
    tag = "Admin / Role Management",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn get_role_permissions(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresRoleRepository::new(pool));
    let use_case = GetRolePermissionsUseCase::new(repo);

    let permissions = use_case.execute(id).await?;

    let permissions: Vec<PermissionDto> = permissions.into_iter().map(|p| p.into()).collect();

    Ok((StatusCode::OK, JsonApiResponse::new(permissions)))
}

fn require_role_management(permissions: &[Permission]) -> Result<(), AppError> {
    if permissions.contains(&Permission::Wildcard)
        || permissions.contains(&Permission::RoleManagement)
    {
        Ok(())
    } else {
        Err(AppError::Forbidden("Insufficient permissions".to_string()))
    }
}
