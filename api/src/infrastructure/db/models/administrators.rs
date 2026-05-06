use crate::domain::administrators::Administrator;
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct AdministratorDbModel {
    pub id: Uuid,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub suffix: Option<String>,
    pub contact_number: Option<String>,
    pub email: String,
    pub password_hash: String,
    pub roles: Option<sqlx::types::JsonValue>,
    pub email_verified_at: Option<OffsetDateTime>,
    pub revoked_at: Option<OffsetDateTime>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

impl From<AdministratorDbModel> for Administrator {
    fn from(model: AdministratorDbModel) -> Self {
        Self {
            id: model.id,
            first_name: model.first_name,
            middle_name: model.middle_name,
            last_name: model.last_name,
            suffix: model.suffix,
            contact_number: model.contact_number,
            email: model.email,
            password_hash: model.password_hash,
            roles: model.roles.and_then(|v| serde_json::from_value(v).ok()),
            email_verified_at: model.email_verified_at,
            revoked_at: model.revoked_at,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}
