pub mod auth;
pub mod profile;

use crate::infrastructure::state::AppState;
use axum::Router;

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/profile", profile::routes())
        .nest("/my", Router::new().route("/profile", axum::routing::get(crate::presentation::client::handlers::profile::get_profile)))
}
