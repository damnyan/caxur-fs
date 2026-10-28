pub mod auth;
pub mod profile;

use crate::infrastructure::state::AppState;
use crate::presentation::client::handlers::profile::get_profile;
use crate::presentation::client::handlers::upload::upload_file;
use crate::presentation::middleware::rate_limit::{api_rate_limit_layer, auth_rate_limit_layer};
use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
};
use std::env;

pub fn routes(state: AppState) -> anyhow::Result<Router<AppState>> {
    let auth_router = Router::new()
        .nest("/auth", auth::routes())
        .layer(auth_rate_limit_layer(state.auth_service.clone())?);

    let max_upload_size_mb: usize = env::var("MAX_UPLOAD_SIZE_MB")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(10);

    let standard_router = Router::new()
        .nest("/profile", profile::routes())
        .nest("/my", Router::new().route("/profile", get(get_profile)))
        .route(
            "/upload",
            post(upload_file).layer(DefaultBodyLimit::max(max_upload_size_mb * 1024 * 1024)),
        )
        .layer(api_rate_limit_layer(state.auth_service.clone())?);

    Ok(Router::new().merge(auth_router).merge(standard_router))
}
