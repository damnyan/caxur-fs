use crate::infrastructure::auth::JwtAuthService;
use crate::infrastructure::db::DbPool;
use moka::sync::Cache;
use std::sync::Arc;
use std::time::Duration;

use crate::domain::cache::CacheService;
use crate::domain::storage::StorageService;
use crate::infrastructure::email::EmailService;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub auth_service: Arc<JwtAuthService>,
    pub email_service: Arc<dyn EmailService>,
    pub cache_service: Arc<dyn CacheService>,
    pub storage_service: Arc<dyn StorageService>,
    pub admin_url: String,
    pub client_url: String,
    pub admin_permissions_cache:
        Cache<uuid::Uuid, crate::domain::administrators::AdminPermissionsAndStatus>,
}

impl AppState {
    pub fn new(
        pool: DbPool,
        auth_service: Arc<JwtAuthService>,
        email_service: Arc<dyn EmailService>,
        cache_service: Arc<dyn CacheService>,
        storage_service: Arc<dyn StorageService>,
        admin_url: String,
        client_url: String,
    ) -> Self {
        let admin_permissions_cache = Cache::builder()
            .max_capacity(1000)
            .time_to_live(Duration::from_secs(10))
            .build();

        Self {
            pool,
            auth_service,
            email_service,
            cache_service,
            storage_service,
            admin_url,
            client_url,
            admin_permissions_cache,
        }
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

impl axum::extract::FromRef<AppState> for Arc<dyn StorageService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.storage_service.clone()
    }
}
