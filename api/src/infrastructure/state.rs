use crate::infrastructure::auth::JwtAuthService;
use crate::infrastructure::db::DbPool;
use std::sync::Arc;

use crate::infrastructure::email::EmailService;
use crate::domain::cache::CacheService;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub auth_service: Arc<JwtAuthService>,
    pub email_service: Arc<dyn EmailService>,
    pub cache_service: Arc<dyn CacheService>,
    pub admin_url: String,
    pub client_url: String,
}

impl AppState {
    pub fn new(
        pool: DbPool,
        auth_service: Arc<JwtAuthService>,
        email_service: Arc<dyn EmailService>,
        cache_service: Arc<dyn CacheService>,
        admin_url: String,
        client_url: String,
    ) -> Self {
        Self { pool, auth_service, email_service, cache_service, admin_url, client_url }
    }
}

impl axum::extract::FromRef<AppState> for DbPool {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.pool.clone()
    }
}

impl axum::extract::FromRef<AppState> for Arc<JwtAuthService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.auth_service.clone()
    }
}

impl axum::extract::FromRef<AppState> for Arc<dyn EmailService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.email_service.clone()
    }
}
impl axum::extract::FromRef<AppState> for Arc<dyn CacheService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.cache_service.clone()
    }
}
