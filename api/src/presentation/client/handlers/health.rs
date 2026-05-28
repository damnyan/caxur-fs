use crate::infrastructure::db::DbPool;
use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use serde_json::json;

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Health check endpoint with database connectivity test conforming to the IETF Draft standard
pub async fn health_check(State(pool): State<DbPool>) -> impl IntoResponse {
    let now = time::OffsetDateTime::now_utc();
    let time_str = now
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| now.to_string());

    // Test database connectivity
    match sqlx::query("SELECT 1").fetch_one(&pool).await {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({
                "status": "pass",
                "version": VERSION,
                "checks": {
                    "database:postgres": [
                        {
                            "componentType": "datastore",
                            "status": "pass",
                            "time": time_str
                        }
                    ]
                }
            })),
        ),
        Err(e) => {
            tracing::error!("Database health check failed: {:?}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "status": "fail",
                    "version": VERSION,
                    "checks": {
                        "database:postgres": [
                            {
                                "componentType": "datastore",
                                "status": "fail",
                                "output": e.to_string()
                            }
                        ]
                    }
                })),
            )
        }
    }
}

