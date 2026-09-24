pub mod auth;
pub mod profile;

use crate::infrastructure::state::AppState;
use axum::Router;

pub fn routes(state: AppState) -> anyhow::Result<Router<AppState>> {
    let auth_router = Router::new().nest("/auth", auth::routes()).layer(
        crate::presentation::middleware::rate_limit::auth_rate_limit_layer(
            state.auth_service.clone(),
        )?,
    );

    let max_upload_size_mb: usize = std::env::var("MAX_UPLOAD_SIZE_MB")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(10);

    let standard_router = Router::new()
        .nest("/profile", profile::routes())
        .nest(
            "/my",
            Router::new().route(
                "/profile",
                axum::routing::get(crate::presentation::client::handlers::profile::get_profile),
            ),
        )
        .route(
            "/upload",
            axum::routing::post(crate::presentation::client::handlers::upload::upload_file).layer(
                axum::extract::DefaultBodyLimit::max(max_upload_size_mb * 1024 * 1024),
            ),
        )
        .layer(
            crate::presentation::middleware::rate_limit::api_rate_limit_layer(
                state.auth_service.clone(),
            )?,
        );

    Ok(Router::new().merge(auth_router).merge(standard_router))
}
