use crate::application::users::list::{ListUsersRequest, ListUsersUseCase};
use crate::domain::users::UserRepository;
use crate::infrastructure::repositories::users::PostgresUserRepository;
use crate::infrastructure::state::AppState;
use crate::presentation::dtos::UserResource;
use crate::presentation::extractors::AuthUser;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::pagination::PaginationLinkBuilder;
use crate::shared::query::Qs;
use crate::shared::response::{JsonApiMeta, JsonApiResource, JsonApiResponse};
use axum::{
    extract::State,
    http::{StatusCode, Uri},
    response::IntoResponse,
};
use std::sync::Arc;

/// List all users with pagination
#[utoipa::path(
    get,
    path = "/api/v1/admin/users",
    params(ListUsersRequest),
    responses(
        (status = 200, description = "List of users", body = JsonApiResponse<Vec<JsonApiResource<UserResource>>>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Admin / User Management"
)]
pub async fn list_users(
    State(state): State<AppState>,
    uri: Uri,
    Qs(req): Qs<ListUsersRequest>,
    _auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let repo = Arc::new(PostgresUserRepository::new(state.pool));
    let use_case = ListUsersUseCase::new(repo.clone());

    // Capture pagination and search values before moving req
    let page_number = req.page.number;
    let page_size = req.page.size;
    let search = req.search.clone();

    let users = use_case
        .execute(req)
        .await
        .map_err(AppError::InternalServerError)?;

    // Get total count for pagination
    let total = repo
        .count(search)
        .await
        .map_err(AppError::InternalServerError)?;

    let mut resources = Vec::with_capacity(users.len());
    for user in users {
        let user_id = user.id.to_string();
        let user_resource = UserResource::from_user(user, &*state.storage_service).await;
        resources.push(JsonApiResource::new("users", user_id, user_resource));
    }

    // Calculate pagination metadata
    let meta = JsonApiMeta::new()
        .with_page(page_number)
        .with_per_page(page_size)
        .with_total(total);

    // Generate pagination links using the helper
    let links = PaginationLinkBuilder::from_uri(&uri, page_number, page_size, total).build();

    Ok((
        StatusCode::OK,
        JsonApiResponse::new(resources)
            .with_meta(meta)
            .with_links(links),
    ))
}
