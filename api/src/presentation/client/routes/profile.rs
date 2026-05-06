use crate::presentation::client::handlers::profile;
use axum::{Router, routing::patch};
use crate::infrastructure::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/onboarding", patch(profile::complete_onboarding))
        .route("/", patch(profile::update_profile))
}
