use crate::infrastructure::state::AppState;
use crate::presentation::admin::handlers::my::{
    get_my_profile, update_my_password, update_my_profile, initiate_email_change, verify_email_change,
};
use axum::{
    routing::{get, patch, post},
    Router,
};

pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new()
        .route("/profile", get(get_my_profile).patch(update_my_profile))
        .route("/profile/password", patch(update_my_password))
        .route("/profile/email/initiate", post(initiate_email_change))
        .route("/profile/email/verify", post(verify_email_change))
}
