use crate::presentation::client::handlers::auth;
use axum::{Router, routing::post};

use crate::infrastructure::state::AppState;

/// Client Auth routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(auth::login))
        .route("/refresh", post(auth::refresh_token))
        .route("/logout", post(auth::logout))
        .route("/register/initiate", post(auth::register_initiate))
        .route("/register/verify", post(auth::register_verify))
        .route("/email/cancel", post(auth::cancel_email_change))
}
