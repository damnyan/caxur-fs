use crate::domain::permissions::Permission;
use crate::presentation::admin::handlers::administrators;
use crate::presentation::middleware::auth::{RequiredPermissions, check_permissions};
use axum::{
    Extension, Router, middleware,
    routing::{get, post},
};

use crate::infrastructure::state::AppState;

pub fn routes(state: AppState) -> Router<AppState> {
    let protected = Router::new()
        .route("/", post(administrators::create_admin))
        .route("/", get(administrators::list_admins))
        .route(
            "/{id}",
            get(administrators::get_admin)
                .put(administrators::update_admin)
                .delete(administrators::delete_admin),
        )
        .route(
            "/{id}/roles",
            post(administrators::attach_admin_roles).delete(administrators::detach_admin_roles),
        )
        .route("/{id}/revoke", post(administrators::revoke_admin))
        .route("/{id}/restore", post(administrators::restore_admin))
        .route(
            "/{id}/resend-verification",
            post(administrators::resend_verification_admin),
        )
        .route_layer(middleware::from_fn_with_state(state, check_permissions))
        .route_layer(Extension(RequiredPermissions {
            user_type: "admin",
            permissions: vec![Permission::AdministratorManagement],
        }));

    Router::new()
        .route("/verify", post(administrators::verify_admin))
        .merge(protected)
}
