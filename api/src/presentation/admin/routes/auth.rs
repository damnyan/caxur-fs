use crate::presentation::admin::handlers::auth;
use axum::{Router, routing::post};

use crate::infrastructure::state::AppState;

/// Admin Auth routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(auth::admin_login))
        .route("/refresh", post(auth::refresh_token))
        .route("/logout", post(auth::admin_logout))
        .route("/email/cancel", post(auth::cancel_email_change))
        .route("/forgot-password", post(auth::forgot_password))
        .route("/reset-password", post(auth::reset_password))
}
