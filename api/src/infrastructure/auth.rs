use crate::domain::auth::{AuthService, Claims};
use anyhow::Result;
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use uuid::Uuid;

/// JWT Authentication Service using ES256 algorithm
pub struct JwtAuthService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_expiry: i64,
    refresh_token_expiry: i64,
}

impl JwtAuthService {
    /// Create a new JWT service from key content
    pub fn new(
        private_key_pem: &str,
        public_key_pem: &str,
        access_token_expiry: i64,
        refresh_token_expiry: i64,
    ) -> Result<Self> {
        let encoding_key = EncodingKey::from_ec_pem(private_key_pem.as_bytes())
            .map_err(|e| anyhow::anyhow!("Failed to parse private key: {}", e))?;

        let decoding_key = DecodingKey::from_ec_pem(public_key_pem.as_bytes())
            .map_err(|e| anyhow::anyhow!("Failed to parse public key: {}", e))?;

        Ok(Self {
            encoding_key,
            decoding_key,
            access_token_expiry,
            refresh_token_expiry,
        })
    }
}

impl AuthService for JwtAuthService {
    fn generate_access_token(&self, user_id: Uuid, user_type: String) -> Result<String> {
        let claims = Claims::new_access_token(user_id, user_type, self.access_token_expiry);
        let header = Header::new(Algorithm::ES256);

        encode(&header, &claims, &self.encoding_key)
            .map_err(|e| anyhow::anyhow!("Failed to generate access token: {}", e))
    }

    fn generate_refresh_token(&self, user_id: Uuid, user_type: String) -> Result<String> {
        let claims = Claims::new_refresh_token(user_id, user_type, self.refresh_token_expiry);
        let header = Header::new(Algorithm::ES256);

        encode(&header, &claims, &self.encoding_key)
            .map_err(|e| anyhow::anyhow!("Failed to generate refresh token: {}", e))
    }

    fn generate_verification_token(&self, user_id: Uuid, user_type: String) -> Result<String> {
        // Verification tokens expire in 24 hours (86400 seconds)
        let claims = Claims::new_verification_token(user_id, user_type, 86400);
        let header = Header::new(Algorithm::ES256);

        encode(&header, &claims, &self.encoding_key)
            .map_err(|e| anyhow::anyhow!("Failed to generate verification token: {}", e))
    }

    fn validate_token(&self, token: &str) -> Result<Claims> {
        let mut validation = Validation::new(Algorithm::ES256);
        validation.validate_exp = true;

        let token_data = decode::<Claims>(token, &self.decoding_key, &validation)
            .map_err(|e| anyhow::anyhow!("Invalid token: {}", e))?;

        Ok(token_data.claims)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_PRIVATE_KEY: &str = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgXShTihFbNTSa14xH\nQjKpkLjzdhSP5lwJO2h25FosLEKhRANCAAQMC1J0EtKKYd2XmBnZZJd319Ae/K29\nMRbfOkjiINQ1JCIK7wvITDT4HmytHoBh1F2XcjXWlkoGAsRzcm5dcBD6\n-----END PRIVATE KEY-----\n";
    const TEST_PUBLIC_KEY: &str = "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEDAtSdBLSimHdl5gZ2WSXd9fQHvyt\nvTEW3zpI4iDUNSQiCu8LyEw0+B5srR6AYdRdl3I11pZKBgLEc3JuXXAQ+g==\n-----END PUBLIC KEY-----\n";

    #[test]
    fn test_generate_and_validate_access_token() {
        let service = JwtAuthService::new(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY, 900, 604800).unwrap();

        let user_id = Uuid::new_v4();
        let token = service
            .generate_access_token(user_id, "user".to_string())
            .unwrap();

        let claims = service.validate_token(&token).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.user_type, "user");
        assert_eq!(claims.token_type, "access");
    }

    #[test]
    fn test_generate_and_validate_refresh_token() {
        let service = JwtAuthService::new(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY, 900, 604800).unwrap();

        let user_id = Uuid::new_v4();
        let token = service
            .generate_refresh_token(user_id, "user".to_string())
            .unwrap();

        let claims = service.validate_token(&token).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.user_type, "user");
        assert_eq!(claims.token_type, "refresh");
    }
}
