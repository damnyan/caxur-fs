use crate::domain::users::User;
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct UserDbModel {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub suffix: Option<String>,
    pub face_photo: Option<String>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

impl From<UserDbModel> for User {
    fn from(model: UserDbModel) -> Self {
        Self {
            id: model.id,
            email: model.email,
            password_hash: model.password_hash,
            first_name: model.first_name,
            middle_name: model.middle_name,
            last_name: model.last_name,
            suffix: model.suffix,
            face_photo: model.face_photo,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}
