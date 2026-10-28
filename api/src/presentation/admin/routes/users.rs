use crate::infrastructure::state::AppState;
use crate::presentation::admin::handlers::users;
use crate::presentation::middleware::auth::{RequiredPermissions, check_permissions};
use axum::{Extension, Router, middleware, routing::get};

/// Admin User Management routes
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", get(users::list_users))
        .route_layer(middleware::from_fn_with_state(state, check_permissions))
        .route_layer(Extension(RequiredPermissions {
            user_type: "admin",
            permissions: vec![],
        }))
}
