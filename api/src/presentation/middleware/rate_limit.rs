use axum::{body::Body, extract::ConnectInfo};
use governor::{clock::QuantaInstant, middleware::NoOpMiddleware};
use std::env;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder, key_extractor::KeyExtractor};
use crate::infrastructure::auth::JwtAuthService;
use crate::domain::auth::AuthService;

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum RateLimitKey {
    Authenticated { user_id: String, path: String },
    Anonymous { ip: IpAddr, path: String },
}

#[derive(Clone)]
pub struct SmartRateLimitKeyExtractor {
    auth_service: Arc<JwtAuthService>,
}

impl SmartRateLimitKeyExtractor {
    pub fn new(auth_service: Arc<JwtAuthService>) -> Self {
        Self { auth_service }
    }
}

impl KeyExtractor for SmartRateLimitKeyExtractor {
    type Key = RateLimitKey;

    fn extract<B>(
        &self,
        req: &axum::http::Request<B>,
    ) -> Result<Self::Key, tower_governor::errors::GovernorError> {
        let path = req.uri().path().to_string();

        if let Some(auth_header) = req.headers().get(axum::http::header::AUTHORIZATION) {
            if let Ok(auth_str) = auth_header.to_str() {
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..];
                    if let Ok(claims) = self.auth_service.validate_token(token) {
                        return Ok(RateLimitKey::Authenticated {
                            user_id: claims.sub,
                            path,
                        });
                    }
                }
            }
        }

        let ip = req
            .extensions()
            .get::<ConnectInfo<SocketAddr>>()
            .map(|ConnectInfo(addr)| addr.ip())
            .or_else(|| {
                // Return local IP if connection info is missing (e.g. in tests)
                Some(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)))
            })
            .ok_or(tower_governor::errors::GovernorError::UnableToExtractKey)?;

        Ok(RateLimitKey::Anonymous { ip, path })
    }
}

pub fn custom_rate_limit_layer(
    requests_per_minute: u64,
    auth_service: Arc<JwtAuthService>,
) -> anyhow::Result<GovernorLayer<SmartRateLimitKeyExtractor, NoOpMiddleware<QuantaInstant>, Body>> {
    let quota_duration_ms = 60_000 / requests_per_minute;

    let config = Arc::new(
        GovernorConfigBuilder::default()
            .per_millisecond(quota_duration_ms)
            .burst_size(requests_per_minute as u32)
            .key_extractor(SmartRateLimitKeyExtractor::new(auth_service))
            .finish()
            .ok_or_else(|| anyhow::anyhow!("Failed to finish governor config"))?,
    );

    Ok(GovernorLayer::new(config))
}

pub fn auth_rate_limit_layer(auth_service: Arc<JwtAuthService>) -> anyhow::Result<GovernorLayer<SmartRateLimitKeyExtractor, NoOpMiddleware<QuantaInstant>, Body>> {
    let rate_limit = env::var("RATE_LIMIT_AUTH_PER_MINUTE")
        .unwrap_or_else(|_| "10".to_string())
        .parse::<u64>()
        .unwrap_or(10);
    custom_rate_limit_layer(rate_limit, auth_service)
}

pub fn api_rate_limit_layer(auth_service: Arc<JwtAuthService>) -> anyhow::Result<GovernorLayer<SmartRateLimitKeyExtractor, NoOpMiddleware<QuantaInstant>, Body>> {
    let rate_limit = env::var("RATE_LIMIT_PER_MINUTE")
        .unwrap_or_else(|_| "300".to_string())
        .parse::<u64>()
        .unwrap_or(300);
    custom_rate_limit_layer(rate_limit, auth_service)
}

pub fn public_rate_limit_layer(auth_service: Arc<JwtAuthService>) -> anyhow::Result<GovernorLayer<SmartRateLimitKeyExtractor, NoOpMiddleware<QuantaInstant>, Body>> {
    let rate_limit = env::var("RATE_LIMIT_PUBLIC_PER_MINUTE")
        .unwrap_or_else(|_| "60".to_string())
        .parse::<u64>()
        .unwrap_or(60);
    custom_rate_limit_layer(rate_limit, auth_service)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    const TEST_PRIVATE_KEY: &str = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgXShTihFbNTSa14xH\nQjKpkLjzdhSP5lwJO2h25FosLEKhRANCAAQMC1J0EtKKYd2XmBnZZJd319Ae/K29\nMRbfOkjiINQ1JCIK7wvITDT4HmytHoBh1F2XcjXWlkoGAsRzcm5dcBD6\n-----END PRIVATE KEY-----\n";
    const TEST_PUBLIC_KEY: &str = "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEDAtSdBLSimHdl5gZ2WSXd9fQHvyt\nvTEW3zpI4iDUNSQiCu8LyEw0+B5srR6AYdRdl3I11pZKBgLEc3JuXXAQ+g==\n-----END PUBLIC KEY-----\n";

    #[test]
    fn test_anonymous_extraction() {
        let auth_service = Arc::new(JwtAuthService::new(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY, 900, 604800).unwrap());
        let extractor = SmartRateLimitKeyExtractor::new(auth_service);

        let req = Request::builder().uri("/api/test").body(()).unwrap();
        
        let key = extractor.extract(&req).unwrap();
        assert_eq!(
            key,
            RateLimitKey::Anonymous {
                ip: IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)),
                path: "/api/test".to_string(),
            }
        );
    }

    #[test]
    fn test_authenticated_extraction() {
        let auth_service = Arc::new(JwtAuthService::new(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY, 900, 604800).unwrap());
        let extractor = SmartRateLimitKeyExtractor::new(auth_service.clone());

        let user_id = uuid::Uuid::new_v4();
        let token = auth_service.generate_access_token(user_id, "user".to_string()).unwrap();

        let req = Request::builder()
            .uri("/api/protected")
            .header("Authorization", format!("Bearer {}", token))
            .body(())
            .unwrap();

        let key = extractor.extract(&req).unwrap();
        assert_eq!(
            key,
            RateLimitKey::Authenticated {
                user_id: user_id.to_string(),
                path: "/api/protected".to_string(),
            }
        );
    }
}
