use crate::domain::administrators::{AdministratorRepository, UpdateAdministrator};
use crate::domain::auth::AuthService;
use crate::domain::password::PasswordHashingService;
use crate::shared::error::AppError;
use serde::Deserialize;
use std::sync::Arc;
use time::OffsetDateTime;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Deserialize, ToSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VerifyAndSetPasswordRequest {
    pub token: String,
    #[validate(custom(function = "crate::shared::validation::validate_password_strength"))]
    pub password: String,
}

pub struct VerifyAndSetPasswordUseCase {
    repo: Arc<dyn AdministratorRepository>,
    auth_service: Arc<dyn AuthService>,
    password_service: Arc<dyn PasswordHashingService>,
}

impl VerifyAndSetPasswordUseCase {
    pub fn new(
        repo: Arc<dyn AdministratorRepository>,
        auth_service: Arc<dyn AuthService>,
        password_service: Arc<dyn PasswordHashingService>,
    ) -> Self {
        Self {
            repo,
            auth_service,
            password_service,
        }
    }

    #[tracing::instrument(skip(self, req))]
    pub async fn execute(&self, req: VerifyAndSetPasswordRequest) -> Result<(), AppError> {
        let claims = self
            .auth_service
            .validate_token(&req.token)
            .map_err(|_| AppError::Unauthorized("Invalid or expired token".to_string()))?;

        if claims.token_type != "verification" {
            return Err(AppError::Unauthorized("Invalid token type".to_string()));
        }

        let user_id = claims
            .user_id()
            .map_err(|_| AppError::Unauthorized("Invalid user ID in token".to_string()))?;

        let admin = self
            .repo
            .find_by_id(user_id)
            .await
            .map_err(AppError::InternalServerError)?
            .ok_or_else(|| AppError::NotFound("Administrator not found".to_string()))?;

        if admin.email_verified_at.is_some() {
            return Err(AppError::BadRequest(
                "Email is already verified".to_string(),
            ));
        }

        let password_hash = self
            .password_service
            .hash_password(&req.password)
            .await
            .map_err(AppError::InternalServerError)?;

        let update = UpdateAdministrator {
            first_name: None,
            middle_name: None,
            last_name: None,
            suffix: None,
            contact_number: None,
            email: None,
            password_hash: Some(password_hash),
            email_verified_at: Some(Some(OffsetDateTime::now_utc())),
            revoked_at: None,
        };

        self.repo
            .update(user_id, update)
            .await
            .map_err(AppError::InternalServerError)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::administrators::{
        AdminPermissionsAndStatus, Administrator, NewAdministrator,
    };
    use crate::domain::permissions::Permission;
    use crate::infrastructure::auth::JwtAuthService;
    use async_trait::async_trait;
    use tokio::sync::Mutex;
    use uuid::Uuid;

    struct FakeAdminRepo {
        admin: Mutex<Option<Administrator>>,
    }

    #[async_trait]
    impl AdministratorRepository for FakeAdminRepo {
        async fn create(&self, _new_admin: NewAdministrator) -> anyhow::Result<Administrator> {
            Err(anyhow::anyhow!("not used in test"))
        }
        async fn find_by_id(&self, id: Uuid) -> anyhow::Result<Option<Administrator>> {
            let guard = self.admin.lock().await;
            Ok(guard.clone().filter(|a| a.id == id))
        }
        async fn find_by_email(&self, _email: &str) -> anyhow::Result<Option<Administrator>> {
            Ok(None)
        }
        async fn find_all(
            &self,
            _search: Option<String>,
            _role_id: Option<Uuid>,
            _limit: i64,
            _offset: i64,
        ) -> anyhow::Result<Vec<Administrator>> {
            Ok(Vec::new())
        }
        async fn count(
            &self,
            _search: Option<String>,
            _role_id: Option<Uuid>,
        ) -> anyhow::Result<i64> {
            Ok(0)
        }
        async fn update(
            &self,
            _id: Uuid,
            update: UpdateAdministrator,
        ) -> anyhow::Result<Administrator> {
            let mut guard = self.admin.lock().await;
            let admin = guard.as_mut().unwrap();
            if let Some(hash) = update.password_hash {
                admin.password_hash = hash;
            }
            if let Some(verified_at) = update.email_verified_at {
                admin.email_verified_at = verified_at;
            }
            Ok(admin.clone())
        }
        async fn delete(&self, _id: Uuid) -> anyhow::Result<bool> {
            Ok(false)
        }
        async fn attach_roles(&self, _admin_id: Uuid, _role_ids: Vec<Uuid>) -> anyhow::Result<()> {
            Ok(())
        }
        async fn detach_roles(&self, _admin_id: Uuid, _role_ids: Vec<Uuid>) -> anyhow::Result<()> {
            Ok(())
        }
        async fn get_permissions(&self, _admin_id: Uuid) -> anyhow::Result<Vec<Permission>> {
            Ok(Vec::new())
        }
        async fn find_permissions_and_status(
            &self,
            _admin_id: Uuid,
        ) -> anyhow::Result<AdminPermissionsAndStatus> {
            Ok(AdminPermissionsAndStatus {
                is_found: false,
                revoked_at: None,
                permissions: Vec::new(),
            })
        }
    }

    struct FakePasswordService;

    #[async_trait]
    impl PasswordHashingService for FakePasswordService {
        async fn hash_password(&self, password: &str) -> anyhow::Result<String> {
            Ok(format!("hashed:{password}"))
        }
        async fn verify_password(&self, password: &str, hash: &str) -> anyhow::Result<bool> {
            Ok(hash == format!("hashed:{password}"))
        }
    }

    const TEST_PRIVATE_KEY: &str = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgXShTihFbNTSa14xH\nQjKpkLjzdhSP5lwJO2h25FosLEKhRANCAAQMC1J0EtKKYd2XmBnZZJd319Ae/K29\nMRbfOkjiINQ1JCIK7wvITDT4HmytHoBh1F2XcjXWlkoGAsRzcm5dcBD6\n-----END PRIVATE KEY-----\n";
    const TEST_PUBLIC_KEY: &str = "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEDAtSdBLSimHdl5gZ2WSXd9fQHvyt\nvTEW3zpI4iDUNSQiCu8LyEw0+B5srR6AYdRdl3I11pZKBgLEc3JuXXAQ+g==\n-----END PUBLIC KEY-----\n";

    #[tokio::test]
    async fn test_verify_once_and_reject_replay() {
        let admin_id = Uuid::new_v4();
        let now = OffsetDateTime::now_utc();
        let repo = Arc::new(FakeAdminRepo {
            admin: Mutex::new(Some(Administrator {
                id: admin_id,
                first_name: "Test".to_string(),
                middle_name: None,
                last_name: "Admin".to_string(),
                suffix: None,
                contact_number: None,
                email: "admin@example.com".to_string(),
                password_hash: "initial".to_string(),
                roles: None,
                email_verified_at: None,
                revoked_at: None,
                created_at: now,
                updated_at: now,
            })),
        });
        let auth_service =
            Arc::new(JwtAuthService::new(TEST_PRIVATE_KEY, TEST_PUBLIC_KEY, 900, 604800).unwrap());
        let password_service = Arc::new(FakePasswordService);
        let use_case =
            VerifyAndSetPasswordUseCase::new(repo.clone(), auth_service.clone(), password_service);

        let token = auth_service
            .generate_verification_token(admin_id, "admin".to_string())
            .unwrap();

        // First call succeeds
        let res1 = use_case
            .execute(VerifyAndSetPasswordRequest {
                token: token.clone(),
                password: "StrongPassword1!".to_string(),
            })
            .await;
        assert!(res1.is_ok());

        // Second call with the same token is rejected with BadRequest
        let res2 = use_case
            .execute(VerifyAndSetPasswordRequest {
                token,
                password: "AnotherPassword2!".to_string(),
            })
            .await;
        assert!(
            matches!(res2, Err(AppError::BadRequest(msg)) if msg == "Email is already verified")
        );
    }
}
