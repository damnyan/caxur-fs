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

    let standard_router = Router::new()
        .nest("/profile", profile::routes())
        .nest(
            "/my",
            Router::new().route(
                "/profile",
                axum::routing::get(crate::presentation::client::handlers::profile::get_profile),
            ),
        )
        .layer(
            crate::presentation::middleware::rate_limit::api_rate_limit_layer(
                state.auth_service.clone(),
            )?,
        );

    Ok(Router::new().merge(auth_router).merge(standard_router))
}
