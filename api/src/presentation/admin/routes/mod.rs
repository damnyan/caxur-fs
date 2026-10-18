pub mod administrators;
pub mod auth;
pub mod my;
pub mod permissions;
pub mod roles;
pub mod users;

use crate::infrastructure::state::AppState;
use crate::presentation::middleware::rate_limit::{api_rate_limit_layer, auth_rate_limit_layer};
use axum::Router;

pub fn routes(state: AppState) -> anyhow::Result<Router<AppState>> {
    let auth_router = Router::new()
        .nest("/auth", auth::routes())
        .layer(auth_rate_limit_layer(state.auth_service.clone())?);

    let standard_router = Router::new()
        .nest("/administrators", administrators::routes(state.clone()))
        .nest("/roles", roles::routes(state.clone()))
        .nest("/permissions", permissions::routes(state.clone()))
        .nest("/users", users::routes(state.clone()))
        .nest("/my", my::routes(state.clone()))
        .layer(api_rate_limit_layer(state.auth_service.clone())?);

    Ok(Router::new().merge(auth_router).merge(standard_router))
}
