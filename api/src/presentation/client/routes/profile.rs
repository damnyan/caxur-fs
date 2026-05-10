use crate::presentation::client::handlers::profile;
use axum::{Router, routing::{patch, post}};
use crate::infrastructure::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/onboarding", patch(profile::complete_onboarding))
        .route("/", patch(profile::update_profile))
        .route("/email/initiate", post(profile::initiate_email_change))
        .route("/email/verify", post(profile::verify_email_change))
}
