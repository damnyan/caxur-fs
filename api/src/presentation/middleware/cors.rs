use axum::http::{HeaderValue, Method, header};
use std::env;
use tower_http::cors::{Any, CorsLayer};

pub fn cors_layer() -> anyhow::Result<CorsLayer> {
    let allowed_origins = env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| "".to_string());

    let mut layer = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            header::ORIGIN,
        ])
        .expose_headers([header::CONTENT_DISPOSITION, header::CONTENT_LENGTH]);

    if allowed_origins == "*" {
        layer = layer.allow_origin(Any);
    } else {
        let origins_str = if allowed_origins.trim().is_empty() {
            let admin_url =
                env::var("ADMIN_URL").unwrap_or_else(|_| "http://localhost:3001".to_string());
            let client_url =
                env::var("CLIENT_URL").unwrap_or_else(|_| "http://localhost:3002".to_string());
            format!("{},{}", admin_url, client_url)
        } else {
            allowed_origins
        };

        let origins: Vec<HeaderValue> = origins_str
            .split(',')
            .map(|s| s.trim().parse())
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| anyhow::anyhow!("Invalid CORS origin: {}", e))?;
        layer = layer.allow_origin(origins).allow_credentials(true);
    }

    Ok(layer)
}
