pub mod auth;

use crate::infrastructure::state::AppState;
use axum::Router;

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/auth", auth::routes())
}
