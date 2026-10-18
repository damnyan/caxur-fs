use crate::domain::permissions::Permission;
use crate::infrastructure::state::AppState;
use crate::presentation::admin::handlers::permissions;
use crate::presentation::middleware::auth::{RequiredPermissions, check_permissions};
use axum::{Extension, Router, middleware, routing::get};

/// Permission routes - handles permission listing
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", get(permissions::list_permissions))
        .route_layer(middleware::from_fn_with_state(state, check_permissions))
        .route_layer(Extension(RequiredPermissions {
            user_type: "admin",
            permissions: vec![
                Permission::RoleManagement,
                Permission::AdministratorManagement,
            ],
        }))
}
