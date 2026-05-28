use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::permissions::Permission;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum PermissionDto {
    #[serde(rename = "*")]
    Wildcard,
    AdministratorManagement,
    RoleManagement,
}

impl From<Permission> for PermissionDto {
    fn from(p: Permission) -> Self {
        match p {
            Permission::Wildcard => PermissionDto::Wildcard,
            Permission::AdministratorManagement => PermissionDto::AdministratorManagement,
            Permission::RoleManagement => PermissionDto::RoleManagement,
        }
    }
}

impl From<PermissionDto> for Permission {
    fn from(val: PermissionDto) -> Self {
        match val {
            PermissionDto::Wildcard => Permission::Wildcard,
            PermissionDto::AdministratorManagement => Permission::AdministratorManagement,
            PermissionDto::RoleManagement => Permission::RoleManagement,
        }
    }
}

use crate::application::auth::login::LoginResponse;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuthTokenResource {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: Option<UserResource>,
}

impl From<LoginResponse> for AuthTokenResource {
    fn from(response: LoginResponse) -> Self {
        Self {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            token_type: response.token_type,
            expires_in: response.expires_in,
            user: None,
        }
    }
}

impl AuthTokenResource {
    pub fn new(response: LoginResponse, user: Option<User>) -> Self {
        Self {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            token_type: response.token_type,
            expires_in: response.expires_in,
            user: user.map(UserResource::from),
        }
    }
}

use crate::domain::users::User;

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserResource {
    pub id: String,
    pub email: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,
    pub face_photo: Option<String>,
    pub face_photo_url: Option<String>,
    #[serde(with = "time::serde::iso8601")]
    #[schema(value_type = String)]
    pub created_at: time::OffsetDateTime,
    #[serde(with = "time::serde::iso8601")]
    #[schema(value_type = String)]
    pub updated_at: time::OffsetDateTime,
}

impl From<User> for UserResource {
    fn from(user: User) -> Self {
        Self {
            id: user.id.to_string(),
            email: user.email,
            first_name: user.first_name,
            middle_name: user.middle_name,
            last_name: user.last_name,
            suffix: user.suffix,
            face_photo: user.face_photo,
            face_photo_url: None,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}

impl UserResource {
    #[allow(clippy::collapsible_if)]
    pub async fn from_user(
        user: User,
        storage_service: &dyn crate::domain::storage::StorageService,
    ) -> Self {
        let mut resource = Self::from(user);
        if let Some(ref photo) = resource.face_photo {
            if let Ok(url) = storage_service.get_presigned_url(photo, 3600).await {
                resource.face_photo_url = Some(url);
            }
        }
        resource
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_dto_conversion() {
        // Test Wildcard conversion
        let domain_wildcard = Permission::Wildcard;
        let dto_wildcard: PermissionDto = domain_wildcard.into();
        assert_eq!(dto_wildcard, PermissionDto::Wildcard);

        let back_wildcard: Permission = dto_wildcard.into();
        assert_eq!(back_wildcard, Permission::Wildcard);

        // Test AdministratorManagement conversion
        let domain_admin = Permission::AdministratorManagement;
        let dto_admin: PermissionDto = domain_admin.into();
        assert_eq!(dto_admin, PermissionDto::AdministratorManagement);

        let back_admin: Permission = dto_admin.into();
        assert_eq!(back_admin, Permission::AdministratorManagement);
    }
}
