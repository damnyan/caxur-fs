use crate::infrastructure::db::DbPool;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde_json::json;

/// Health check endpoint with database connectivity test
pub async fn health_check(State(pool): State<DbPool>) -> impl IntoResponse {
    // Test database connectivity
    match sqlx::query("SELECT 1").fetch_one(&pool).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "status": "healthy",
                "database": "connected"
            })),
        ),
        Err(e) => {
            tracing::error!("Database health check failed: {:?}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "status": "unhealthy",
                    "database": "disconnected"
                })),
            )
        }
    }
}

