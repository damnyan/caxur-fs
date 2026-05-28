use caxur::infrastructure;
use caxur::presentation;

use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use anyhow::Context;

use std::future::Future;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let port = env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);
    run_with_signal(port).await
}

async fn run_with_signal(port: u16) -> anyhow::Result<()> {
    run(port, async {
        let _ = tokio::signal::ctrl_c().await;
    })
    .await
}

async fn run<F>(port: u16, shutdown_signal: F) -> anyhow::Result<()>
where
    F: Future<Output = ()> + Send + 'static,
{
    dotenv().ok();

    // Initialize tracing only if it hasn't been initialized yet
    // We ignore the error because in tests it might be called multiple times
    let _ = tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "caxur=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .try_init();

    let database_url = env::var("DATABASE_URL").context("DATABASE_URL must be set")?;

    let (listener, app) = bootstrap(&database_url, port).await?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal)
        .await?;

    Ok(())
}

async fn bootstrap(
    database_url: &str,
    port: u16,
) -> anyhow::Result<(tokio::net::TcpListener, axum::Router)> {
    let pool = infrastructure::db::create_pool(database_url).await?;

    // Run migrations
    sqlx::migrate!().run(&pool).await?;

    // Get configuration from environment
    let private_key_pem = std::env::var("JWT_PRIVATE_KEY")
        .context("JWT_PRIVATE_KEY must be set")?
        .replace("\\n", "\n");

    let public_key_pem = std::env::var("JWT_PUBLIC_KEY")
        .context("JWT_PUBLIC_KEY must be set")?
        .replace("\\n", "\n");
    let access_token_expiry = std::env::var("JWT_ACCESS_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "900".to_string())
        .parse::<i64>()
        .unwrap_or(900);
    let refresh_token_expiry = std::env::var("JWT_REFRESH_TOKEN_EXPIRY")
        .unwrap_or_else(|_| "604800".to_string())
        .parse::<i64>()
        .unwrap_or(604800);

    // Initialize auth service
    let auth_service = std::sync::Arc::new(
        infrastructure::auth::JwtAuthService::new(
            &private_key_pem,
            &public_key_pem,
            access_token_expiry,
            refresh_token_expiry,
        )
        .map_err(|e| anyhow::anyhow!("Failed to initialize auth service: {}", e))?,
    );

    let smtp_host = env::var("SMTP_HOST").context("SMTP_HOST must be set")?;
    let smtp_port = env::var("SMTP_PORT")
        .unwrap_or_else(|_| "2525".to_string())
        .parse::<u16>()
        .unwrap_or(2525);
    let smtp_username = env::var("SMTP_USERNAME").context("SMTP_USERNAME must be set")?;
    let smtp_password = env::var("SMTP_PASSWORD").context("SMTP_PASSWORD must be set")?;
    let smtp_from = env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@caxur.com".to_string());
    let app_name = env::var("APP_NAME").unwrap_or_else(|_| "Caxur".to_string());

    let email_service = std::sync::Arc::new(
        infrastructure::email::SmtpEmailService::new(
            &smtp_host,
            smtp_port,
            &smtp_username,
            &smtp_password,
            smtp_from,
            app_name,
        )
        .map_err(|e| anyhow::anyhow!("Failed to initialize email service: {}", e))?,
    );

    let cache_service = std::sync::Arc::new(infrastructure::cache::MokaCacheService::new(1000));

    let storage_service = std::sync::Arc::new(infrastructure::storage::s3::S3StorageService::new());
    storage_service
        .init_bucket()
        .await
        .context("Failed to initialize storage bucket")?;

    let admin_url = env::var("ADMIN_URL").context("ADMIN_URL must be set")?;
    let client_url = env::var("CLIENT_URL").context("CLIENT_URL must be set")?;

    let state = infrastructure::state::AppState::new(
        pool,
        auth_service,
        email_service,
        cache_service,
        storage_service,
        admin_url,
        client_url,
    );

    let app = presentation::router::app(state)?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::debug!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;

    Ok((listener, app))
}
