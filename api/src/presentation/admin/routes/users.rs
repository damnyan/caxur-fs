use crate::infrastructure::state::AppState;
use crate::presentation::admin::handlers::users;
use axum::{Router, routing::get};

/// Admin User Management routes
pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new().route("/", get(users::list_users))
}
