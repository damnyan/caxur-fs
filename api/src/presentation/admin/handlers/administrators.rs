use crate::application::administrators::create::{
    CreateAdministratorRequest, CreateAdministratorUseCase,
};
use crate::application::administrators::delete::DeleteAdministratorUseCase;
use crate::application::administrators::get::{GetAdministratorUseCase, GetAdministratorRequest};
use crate::application::administrators::list::{
    ListAdministratorsRequest, ListAdministratorsUseCase,
};
use crate::application::administrators::roles::{
    AttachRoles, AttachRolesRequest, DetachRoles, DetachRolesRequest,
};
use crate::application::administrators::verify::{VerifyAndSetPasswordUseCase, VerifyAndSetPasswordRequest};
use crate::application::administrators::resend_verification::ResendVerificationUseCase;
use crate::application::administrators::restore::RestoreAdministratorUseCase;
use crate::application::administrators::revoke::RevokeAdministratorUseCase;
use crate::application::administrators::update::{
    UpdateAdministratorRequest, UpdateAdministratorUseCase,
};
use crate::domain::administrators::Administrator;
use crate::infrastructure::db::DbPool;
use crate::infrastructure::password::PasswordService;
use crate::infrastructure::repositories::administrators::PostgresAdministratorRepository;
use crate::presentation::extractors::AuthUser;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::query::Qs;
use crate::shared::response::{JsonApiMeta, JsonApiResource, JsonApiResponse, JsonApiIdentifier, JsonApiRelationship, JsonApiRelationshipData};
use crate::shared::validation::ValidatedJson;
use axum::{
    Json,
    extract::{Path, State},
    http::{StatusCode, Uri},
    response::IntoResponse,
};
use serde::Serialize;
use serde_json::json;
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdministratorResource {
    pub id: String,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub suffix: Option<String>,
    pub contact_number: Option<String>,
    pub email: String,
    #[serde(with = "time::serde::iso8601::option")]
    #[schema(value_type = Option<String>)]
    pub email_verified_at: Option<time::OffsetDateTime>,
    #[serde(with = "time::serde::iso8601::option")]
    #[schema(value_type = Option<String>)]
    pub revoked_at: Option<time::OffsetDateTime>,
    #[serde(with = "time::serde::iso8601")]
    #[schema(value_type = String)]
    pub created_at: time::OffsetDateTime,
    #[serde(with = "time::serde::iso8601")]
    #[schema(value_type = String)]
    pub updated_at: time::OffsetDateTime,
}

impl From<Administrator> for AdministratorResource {
    fn from(admin: Administrator) -> Self {
        Self {
            id: admin.id.to_string(),
            first_name: admin.first_name,
            middle_name: admin.middle_name,
            last_name: admin.last_name,
            suffix: admin.suffix,
            contact_number: admin.contact_number,
            email: admin.email,
            email_verified_at: admin.email_verified_at,
            revoked_at: admin.revoked_at,
            created_at: admin.created_at,
            updated_at: admin.updated_at,
        }
    }
}

/// Create a new administrator
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators",
    request_body = CreateAdministratorRequest,
    responses(
        (status = 201, description = "Administrator created successfully", body = JsonApiResponse<JsonApiResource<AdministratorResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]

pub fn build_admin_resource(admin: Administrator, include_roles: bool) -> (JsonApiResource<AdministratorResource>, Vec<serde_json::Value>) {
    let mut included = Vec::new();
    let mut rels = std::collections::HashMap::new();

    let resource_attrs = AdministratorResource::from(admin.clone());
    
    if let Some(roles) = admin.roles {
        let mut role_ids = Vec::new();
        for role in roles {
            role_ids.push(JsonApiIdentifier::new("roles", role.id.to_string()));
            
            if include_roles {
                let role_res = JsonApiResource::new("roles", role.id.to_string(), json!({ "name": role.name }));
                included.push(serde_json::to_value(&role_res).unwrap());
            }
        }
        
        rels.insert(
            "roles".to_string(),
            JsonApiRelationship::new()
                .with_data(JsonApiRelationshipData::Many(role_ids)),
        );
    }
    
    let mut api_resource = JsonApiResource::new("administrators", admin.id.to_string(), resource_attrs);
    if !rels.is_empty() {
        api_resource = api_resource.with_relationships(rels);
    }
    
    (api_resource, included)
}

/// Create a new administrator
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators",
    request_body = CreateAdministratorRequest,
    responses(
        (status = 201, description = "Administrator created successfully", body = JsonApiResponse<JsonApiResource<AdministratorResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn create_admin(
    State(pool): State<DbPool>,
    _auth: AuthUser,
    ValidatedJson(req): ValidatedJson<CreateAdministratorRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let hasher = Arc::new(PasswordService::new());
    let auth_service = Arc::new(crate::infrastructure::auth::JwtAuthService::new(
        &std::env::var("JWT_PRIVATE_KEY").unwrap_or_default(),
        &std::env::var("JWT_PUBLIC_KEY").unwrap_or_default(),
        std::env::var("JWT_ACCESS_TOKEN_EXPIRY").unwrap_or_else(|_| "900".to_string()).parse().unwrap_or(900),
        std::env::var("JWT_REFRESH_TOKEN_EXPIRY").unwrap_or_else(|_| "604800".to_string()).parse().unwrap_or(604800),
    ).unwrap());
    let email_service = Arc::new(crate::infrastructure::email::SmtpEmailService::new(
        &std::env::var("SMTP_HOST").unwrap_or_default(),
        std::env::var("SMTP_PORT").unwrap_or_else(|_| "587".to_string()).parse().unwrap_or(587),
        &std::env::var("SMTP_USERNAME").unwrap_or_default(),
        &std::env::var("SMTP_PASSWORD").unwrap_or_default(),
        std::env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@caxur.com".to_string()),
    ).unwrap());
    let admin_url = std::env::var("ADMIN_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
    let use_case = CreateAdministratorUseCase::new(repo, hasher, auth_service, email_service, admin_url);

    let admin = use_case.execute(req).await?;
    let resource = JsonApiResource::new(
        "administrators",
        admin.id.to_string(),
        AdministratorResource::from(admin),
    );

    Ok((StatusCode::CREATED, Json(JsonApiResponse::new(resource))))
}

/// Get an administrator by ID
#[utoipa::path(
    get,
    path = "/api/v1/admin/administrators/{id}",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    responses(
        (status = 200, description = "Administrator found", body = JsonApiResponse<JsonApiResource<AdministratorResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn get_admin(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    Qs(req): Qs<GetAdministratorRequest>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = GetAdministratorUseCase::new(repo);

    let admin = use_case.execute(id).await?;

    match admin {
        Some(admin) => {
            let include_roles = req.include.as_deref().unwrap_or("").contains("roles");
            let (resource, included) = build_admin_resource(admin, include_roles);
            let mut response = JsonApiResponse::new(resource);
            if !included.is_empty() {
                response = response.with_included(included);
            }
            Ok((StatusCode::OK, Json(response)))
        }
        None => Err(AppError::NotFound("Administrator not found".to_string())),
    }
}

/// List all administrators with pagination
#[utoipa::path(
    get,
    path = "/api/v1/admin/administrators",
    params(ListAdministratorsRequest),
    responses(
        (status = 200, description = "List of administrators", body = JsonApiResponse<Vec<JsonApiResource<AdministratorResource>>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn list_admins(
    State(pool): State<DbPool>,
    uri: Uri,
    Qs(req): Qs<ListAdministratorsRequest>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = ListAdministratorsUseCase::new(repo.clone());

    // Capture pagination values before moving req
    let page_number = req.page.number;
    let page_size = req.page.size;

    let include_roles = req.include.as_deref().unwrap_or("").contains("roles");
    
    let admins = use_case.execute(req).await?;

    // Get total count for pagination
    let total = crate::domain::administrators::AdministratorRepository::count(&*repo)
        .await
        .map_err(AppError::InternalServerError)?;
    let mut resources = Vec::new();
    let mut all_included = Vec::new();
    
    for admin in admins {
        let (resource, mut included) = build_admin_resource(admin, include_roles);
        resources.push(resource);
        all_included.append(&mut included);
    }

    // Calculate pagination metadata
    let meta = JsonApiMeta::new()
        .with_page(page_number)
        .with_per_page(page_size)
        .with_total(total);

    // Generate pagination links using the helper
    let links = crate::shared::pagination::PaginationLinkBuilder::from_uri(
        &uri,
        page_number,
        page_size,
        total,
    )
    .build();

    let mut response = JsonApiResponse::new(resources)
        .with_meta(meta)
        .with_links(links);
        
    if !all_included.is_empty() {
        let mut unique_included = std::collections::HashMap::new();
        for item in all_included {
            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                unique_included.insert(id.to_string(), item);
            }
        }
        response = response.with_included(unique_included.into_values().collect());
    }

    Ok((StatusCode::OK, Json(response)))
}

/// Update an administrator
#[utoipa::path(
    put,
    path = "/api/v1/admin/administrators/{id}",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    request_body = UpdateAdministratorRequest,
    responses(
        (status = 200, description = "Administrator updated successfully", body = JsonApiResponse<JsonApiResource<AdministratorResource>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn update_admin(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
    ValidatedJson(req): ValidatedJson<UpdateAdministratorRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let hasher = Arc::new(PasswordService::new());
    let use_case = UpdateAdministratorUseCase::new(repo, hasher);

    let admin = use_case.execute(id, req).await?;
    let (resource, _) = build_admin_resource(admin, false);
    Ok((StatusCode::OK, Json(JsonApiResponse::new(resource))))
}

/// Delete an administrator
#[utoipa::path(
    delete,
    path = "/api/v1/admin/administrators/{id}",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    responses(
        (status = 200, description = "Administrator deleted successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn delete_admin(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = DeleteAdministratorUseCase::new(repo);

    let deleted = use_case.execute(id).await?;

    if deleted {
        let meta = JsonApiMeta::new().with_extra(json!({ "deleted": true }));
        Ok((
            StatusCode::OK,
            Json(JsonApiResponse::new(json!(null)).with_meta(meta)),
        ))
    } else {
        Err(AppError::NotFound("Administrator not found".to_string()))
    }
}

/// Attach roles to an administrator
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators/{id}/roles",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    request_body = AttachRolesRequest,
    responses(
        (status = 200, description = "Roles attached successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn attach_admin_roles(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
    ValidatedJson(req): ValidatedJson<AttachRolesRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = AttachRoles::new(repo);

    use_case.execute(id, req.role_ids).await?;

    Ok((
        StatusCode::OK,
        Json(JsonApiResponse::new(json!({ "success": true }))),
    ))
}

/// Detach roles from an administrator
#[utoipa::path(
    delete,
    path = "/api/v1/admin/administrators/{id}/roles",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    request_body = DetachRolesRequest,
    responses(
        (status = 200, description = "Roles detached successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn detach_admin_roles(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
    ValidatedJson(req): ValidatedJson<DetachRolesRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = DetachRoles::new(repo);

    use_case.execute(id, req.role_ids).await?;

    Ok((
        StatusCode::OK,
        Json(JsonApiResponse::new(json!({ "success": true }))),
    ))
}


/// Revoke an administrator
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators/{id}/revoke",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    responses(
        (status = 200, description = "Administrator revoked", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn revoke_admin(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = RevokeAdministratorUseCase::new(repo);
    use_case.execute(id).await?;
    Ok((StatusCode::OK, Json(JsonApiResponse::new(json!({ "success": true })))))
}

/// Restore an administrator
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators/{id}/restore",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    responses(
        (status = 200, description = "Administrator restored", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn restore_admin(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let use_case = RestoreAdministratorUseCase::new(repo);
    use_case.execute(id).await?;
    Ok((StatusCode::OK, Json(JsonApiResponse::new(json!({ "success": true })))))
}

/// Resend verification email
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators/{id}/resend-verification",
    params(
        ("id" = Uuid, Path, description = "Administrator ID")
    ),
    responses(
        (status = 200, description = "Verification email sent", body = JsonApiResponse<serde_json::Value>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn resend_verification_admin(
    State(pool): State<DbPool>,
    Path(id): Path<Uuid>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    // Provide a mocked email service just like create does or inject properly
    let email_service = Arc::new(crate::infrastructure::email::SmtpEmailService::new(
        &std::env::var("SMTP_HOST").unwrap_or_default(),
        std::env::var("SMTP_PORT").unwrap_or_else(|_| "587".to_string()).parse().unwrap_or(587),
        &std::env::var("SMTP_USERNAME").unwrap_or_default(),
        &std::env::var("SMTP_PASSWORD").unwrap_or_default(),
        std::env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@caxur.com".to_string()),
    ).unwrap());
    let admin_url = std::env::var("ADMIN_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
    let auth_service = Arc::new(crate::infrastructure::auth::JwtAuthService::new(
        &std::env::var("JWT_PRIVATE_KEY").unwrap_or_default(),
        &std::env::var("JWT_PUBLIC_KEY").unwrap_or_default(),
        std::env::var("JWT_ACCESS_TOKEN_EXPIRY").unwrap_or_else(|_| "900".to_string()).parse().unwrap_or(900),
        std::env::var("JWT_REFRESH_TOKEN_EXPIRY").unwrap_or_else(|_| "604800".to_string()).parse().unwrap_or(604800),
    ).unwrap());
    let use_case = ResendVerificationUseCase::new(repo, auth_service, email_service, admin_url);
    use_case.execute(id).await?;
    Ok((StatusCode::OK, Json(JsonApiResponse::new(json!({ "success": true })))))
}

/// Verify and set password
#[utoipa::path(
    post,
    path = "/api/v1/admin/administrators/verify",
    request_body = VerifyAndSetPasswordRequest,
    responses(
        (status = 200, description = "Verified successfully", body = JsonApiResponse<serde_json::Value>),
        (status = 400, description = "Invalid token or password", body = ErrorResponse),
        (status = 404, description = "Administrator not found", body = ErrorResponse)
    ),
    tag = "Admin / Administrator Management"
)]
pub async fn verify_admin(
    State(pool): State<DbPool>,
    ValidatedJson(req): ValidatedJson<VerifyAndSetPasswordRequest>,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresAdministratorRepository::new(pool));
    let hasher = Arc::new(PasswordService::new());
    let auth_service = Arc::new(crate::infrastructure::auth::JwtAuthService::new(
        &std::env::var("JWT_PRIVATE_KEY").unwrap_or_default(),
        &std::env::var("JWT_PUBLIC_KEY").unwrap_or_default(),
        std::env::var("JWT_ACCESS_TOKEN_EXPIRY").unwrap_or_else(|_| "900".to_string()).parse().unwrap_or(900),
        std::env::var("JWT_REFRESH_TOKEN_EXPIRY").unwrap_or_else(|_| "604800".to_string()).parse().unwrap_or(604800),
    ).unwrap());
    let use_case = VerifyAndSetPasswordUseCase::new(repo, auth_service, hasher);
    use_case.execute(req).await?;
    Ok((StatusCode::OK, Json(JsonApiResponse::new(json!({ "success": true })))))
}

