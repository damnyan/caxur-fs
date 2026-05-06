pub mod administrators;
pub mod auth;
pub mod permissions;
pub mod roles;
pub mod users;
pub mod my;

use crate::infrastructure::state::AppState;
use axum::Router;

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest("/administrators", administrators::routes(state.clone()))
        .nest("/roles", roles::routes(state.clone()))
        .nest("/permissions", permissions::routes())
        .nest("/users", users::routes())
        .nest("/auth", auth::routes())
        .nest("/my", my::routes(state))
}
