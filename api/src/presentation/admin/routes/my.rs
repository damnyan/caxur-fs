use crate::infrastructure::state::AppState;
use crate::presentation::admin::handlers::my::{
    get_my_profile, initiate_email_change, update_my_password, update_my_profile,
    verify_email_change,
};
use crate::presentation::middleware::auth::{RequiredPermissions, check_permissions};
use axum::{
    Extension, Router, middleware,
    routing::{get, patch, post},
};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/profile", get(get_my_profile).patch(update_my_profile))
        .route("/profile/password", patch(update_my_password))
        .route("/profile/email/initiate", post(initiate_email_change))
        .route("/profile/email/verify", post(verify_email_change))
        .route_layer(middleware::from_fn_with_state(state, check_permissions))
        .route_layer(Extension(RequiredPermissions {
            user_type: "admin",
            permissions: vec![],
        }))
}
