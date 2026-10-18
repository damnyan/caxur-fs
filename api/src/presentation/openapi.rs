use crate::application::administrators::email_change::{
    InitiateEmailChangeRequest, VerifyEmailChangeRequest,
};
use crate::application::administrators::password_reset::{
    ConfirmPasswordResetRequest as AdminConfirmPasswordResetRequest,
    RequestPasswordResetRequest as AdminRequestPasswordResetRequest,
};
use crate::application::administrators::update_my_password::UpdateMyPasswordRequest;
use crate::application::administrators::update_my_profile::UpdateMyProfileRequest;
use crate::application::administrators::verify::VerifyAndSetPasswordRequest;
use crate::application::auth::admin_login::AdminLoginRequest;
use crate::application::auth::login::{LoginRequest, LoginResponse};
use crate::application::auth::logout::LogoutRequest;
use crate::application::auth::refresh::{RefreshTokenRequest, RefreshTokenResponse};
use crate::application::auth::registration::initiate::InitiateRegistrationRequest;
use crate::application::auth::registration::onboarding::OnboardingRequest;
use crate::application::auth::registration::verify::VerifyRegistrationRequest;
use crate::application::roles::create::CreateRoleRequest;
use crate::application::roles::update::UpdateRoleRequest;
use crate::application::users::email_change::{
    InitiateUserEmailChangeRequest, VerifyUserEmailChangeRequest,
};
use crate::application::users::list::ListUsersRequest;
use crate::application::users::password_reset::{
    ConfirmPasswordResetRequest as UserConfirmPasswordResetRequest,
    RequestPasswordResetRequest as UserRequestPasswordResetRequest,
};
use crate::application::users::update::UpdateUserRequest;
use crate::presentation::admin::handlers::administrators::AdministratorResource;
use crate::presentation::admin::handlers::auth::CancelEmailChangeRequest;
use crate::presentation::admin::handlers::permissions::PermissionResource;
use crate::presentation::admin::handlers::roles::{
    AttachPermissionRequest, DetachPermissionRequest, ListRolesQuery, RoleResource,
};
use crate::presentation::client::handlers::auth::CancelUserEmailChangeRequest;
use crate::presentation::client::handlers::upload::UploadedFileResource;
use crate::presentation::dtos::{AuthTokenResource, PermissionDto, UserResource};
use crate::shared::error::{ErrorResponse, JsonApiError, JsonApiErrorSource};
use crate::shared::pagination::PageParams;
use crate::shared::response::{JsonApiLinks, JsonApiMeta, JsonApiResource, JsonApiResponse};
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::{Modify, OpenApi};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Caxur API",
        version = env!("CARGO_PKG_VERSION"),
        description = "Clean Architecture REST API with Axum and SQLx\n\nThis API follows the JSON:API v1.1 specification for all responses.",
        contact(
            name = "API Support",
            email = "support@example.com"
        )
    ),

    paths(
        crate::presentation::client::handlers::health::health_check,
        crate::presentation::client::handlers::auth::login,
        crate::presentation::client::handlers::auth::refresh_token,
        crate::presentation::client::handlers::auth::logout,
        crate::presentation::client::handlers::auth::register_initiate,
        crate::presentation::client::handlers::auth::register_verify,
        crate::presentation::client::handlers::auth::cancel_email_change,
        crate::presentation::client::handlers::auth::forgot_password,
        crate::presentation::client::handlers::auth::reset_password,
        crate::presentation::client::handlers::profile::complete_onboarding,
        crate::presentation::client::handlers::profile::get_profile,
        crate::presentation::client::handlers::profile::update_profile,
        crate::presentation::client::handlers::profile::initiate_email_change,
        crate::presentation::client::handlers::profile::verify_email_change,
        crate::presentation::client::handlers::upload::upload_file,
        crate::presentation::admin::handlers::auth::admin_login,
        crate::presentation::admin::handlers::auth::refresh_token,
        crate::presentation::admin::handlers::auth::admin_logout,
        crate::presentation::admin::handlers::auth::cancel_email_change,
        crate::presentation::admin::handlers::auth::forgot_password,
        crate::presentation::admin::handlers::auth::reset_password,
        crate::presentation::admin::handlers::my::get_my_profile,
        crate::presentation::admin::handlers::my::update_my_profile,
        crate::presentation::admin::handlers::my::update_my_password,
        crate::presentation::admin::handlers::my::initiate_email_change,
        crate::presentation::admin::handlers::my::verify_email_change,
        crate::presentation::admin::handlers::users::list_users,
        crate::presentation::admin::handlers::administrators::create_admin,
        crate::presentation::admin::handlers::administrators::get_admin,
        crate::presentation::admin::handlers::administrators::list_admins,
        crate::presentation::admin::handlers::administrators::update_admin,
        crate::presentation::admin::handlers::administrators::delete_admin,
        crate::presentation::admin::handlers::administrators::attach_admin_roles,
        crate::presentation::admin::handlers::administrators::detach_admin_roles,
        crate::presentation::admin::handlers::administrators::revoke_admin,
        crate::presentation::admin::handlers::administrators::restore_admin,
        crate::presentation::admin::handlers::administrators::resend_verification_admin,
        crate::presentation::admin::handlers::administrators::verify_admin,
        crate::presentation::admin::handlers::roles::create_role,
        crate::presentation::admin::handlers::roles::get_role,
        crate::presentation::admin::handlers::roles::list_roles,
        crate::presentation::admin::handlers::roles::update_role,
        crate::presentation::admin::handlers::roles::delete_role,
        crate::presentation::admin::handlers::roles::attach_permission,
        crate::presentation::admin::handlers::roles::detach_permission,
        crate::presentation::admin::handlers::roles::get_role_permissions,
        crate::presentation::admin::handlers::permissions::list_permissions,
    ),
    components(
        schemas(
            // Domain models removed (using Resources/DTOs)
            PermissionDto,

            // Request DTOs
            PageParams,
            ListUsersRequest,
            VerifyAndSetPasswordRequest,
            CreateRoleRequest,
            UpdateRoleRequest,
            AttachPermissionRequest,
            DetachPermissionRequest,
            ListRolesQuery,
            LoginRequest,

            AdminLoginRequest,
            LoginResponse,
            LogoutRequest,
            RefreshTokenRequest,
            RefreshTokenResponse,
            InitiateRegistrationRequest,
            VerifyRegistrationRequest,
            OnboardingRequest,
            CancelUserEmailChangeRequest,
            CancelEmailChangeRequest,
            UserRequestPasswordResetRequest,
            UserConfirmPasswordResetRequest,
            AdminRequestPasswordResetRequest,
            AdminConfirmPasswordResetRequest,
            UpdateUserRequest,
            InitiateUserEmailChangeRequest,
            VerifyUserEmailChangeRequest,
            UpdateMyProfileRequest,
            UpdateMyPasswordRequest,
            InitiateEmailChangeRequest,
            VerifyEmailChangeRequest,

            // JSON:API Resource types
            UserResource,
            AdministratorResource,
            RoleResource,
            PermissionResource,
            AuthTokenResource,
            UploadedFileResource,
            JsonApiResource<UserResource>,
            JsonApiResource<AdministratorResource>,
            JsonApiResource<RoleResource>,
            JsonApiResource<PermissionResource>,
            JsonApiResource<AuthTokenResource>,
            JsonApiResource<UploadedFileResource>,

            // JSON:API Response types
            JsonApiResponse<JsonApiResource<UserResource>>,
            JsonApiResponse<Vec<JsonApiResource<UserResource>>>,
            JsonApiResponse<JsonApiResource<AdministratorResource>>,
            JsonApiResponse<Vec<JsonApiResource<AdministratorResource>>>,
            JsonApiResponse<JsonApiResource<RoleResource>>,
            JsonApiResponse<Vec<JsonApiResource<RoleResource>>>,
            JsonApiResponse<Vec<JsonApiResource<PermissionResource>>>,
            JsonApiResponse<Vec<PermissionDto>>,
            JsonApiResponse<JsonApiResource<AuthTokenResource>>,
            JsonApiResponse<JsonApiResource<UploadedFileResource>>,
            JsonApiResponse<serde_json::Value>,


            // JSON:API Metadata and Links
            JsonApiMeta,
            JsonApiLinks,

            // JSON:API Error types
            ErrorResponse,
            JsonApiError,
            JsonApiErrorSource,
        )
    ),
    tags(
        (name = "Health", description = "System health check endpoints"),
        (name = "Client / Auth", description = "Client Authentication endpoints"),
        (name = "Admin / Auth", description = "Administrator Authentication endpoints"),
        (name = "Admin / Administrator Management", description = "Administrator management endpoints"),
        (name = "Admin / User Management", description = "User management endpoints"),
        (name = "Admin / Role Management", description = "Role management endpoints"),
        (name = "Admin / Permission Management", description = "Permission management endpoints"),
        (name = "Admin / My Profile", description = "Current administrator profile management"),
        (name = "Client / Profile", description = "User profile and onboarding endpoints"),
        (name = "Client / Upload", description = "File upload endpoints")
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .build(),
                ),
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    #[test]
    fn generate_openapi_json() {
        let openapi = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&openapi).unwrap();
        std::fs::write("openapi.json", json).expect("Failed to write openapi.json");
        println!("OpenAPI schema generated successfully at api/openapi.json");
    }
}
