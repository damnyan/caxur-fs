use crate::infrastructure::state::AppState;
use crate::presentation::admin;
use crate::presentation::client;
use crate::presentation::middleware;
use crate::presentation::openapi::ApiDoc;
use axum::{Router, routing::get};
use std::env;
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;
use utoipa::{OpenApi, openapi::ServerBuilder};
use utoipa_swagger_ui::{Config, SwaggerUi};

pub fn app(state: AppState) -> anyhow::Result<Router> {
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let mut openapi = ApiDoc::openapi();
    openapi.servers = Some(vec![
        ServerBuilder::new()
            .url(format!("http://localhost:{}", port))
            .description(Some("Local Development Server"))
            .build(),
    ]);

    let swagger_enabled = env::var("SWAGGER_ENABLED")
        .map(|v| v.trim().to_lowercase() == "true")
        .unwrap_or(false);

    let mut router = Router::new();
    if swagger_enabled {
        router = router.merge(
            SwaggerUi::new("/swagger-ui")
                .url("/api-docs/openapi.json", openapi)
                .config(
                    Config::new(["/api-docs/openapi.json"])
                        .deep_linking(true)
                        .default_models_expand_depth(-1)
                        .display_operation_id(true)
                        .doc_expansion("none"),
                ),
        );
    }

    Ok(router
        .route("/health", get(client::handlers::health::health_check))
        // Client routes (Auth, Users) nested under /api/v1
        .nest("/api/v1", client::routes::routes(state.clone())?)
        // Admin routes nested under /api/v1/admin
        .nest("/api/v1/admin", admin::routes::routes(state.clone())?)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .layer(middleware::cors::cors_layer()?)
        .with_state(state))
}
