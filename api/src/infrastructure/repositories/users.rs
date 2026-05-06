use crate::domain::users::{NewUser, UpdateUser, User, UserRepository};
use crate::infrastructure::db::DbPool;
use crate::infrastructure::db::models::users::UserDbModel;
use async_trait::async_trait;
use futures::StreamExt;
use futures::stream::Stream;
use uuid::Uuid;

#[derive(Clone)]
pub struct PostgresUserRepository {
    pool: DbPool,
}

impl PostgresUserRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Batch create multiple users in a single transaction
    #[tracing::instrument(skip(self, new_users))]
    pub async fn batch_create(&self, new_users: Vec<NewUser>) -> Result<Vec<User>, anyhow::Error> {
        let mut tx = self.pool.begin().await?;
        let mut created_users = Vec::with_capacity(new_users.len());

        for new_user in new_users {
            let user_db = sqlx::query_as::<_, UserDbModel>(
                r#"
                INSERT INTO users (email, password_hash, first_name, middle_name, last_name, suffix)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at
                "#,
            )
            .bind(new_user.email)
            .bind(new_user.password_hash)
            .bind(new_user.first_name)
            .bind(new_user.middle_name)
            .bind(new_user.last_name)
            .bind(new_user.suffix)
            .fetch_one(&mut *tx)
            .await?;

            created_users.push(user_db.into());
        }

        tx.commit().await?;
        Ok(created_users)
    }

    /// Stream users for large result sets to avoid loading all into memory
    #[tracing::instrument(skip(self))]
    pub fn find_all_stream(
        &self,
        limit: i64,
        offset: i64,
    ) -> impl Stream<Item = Result<User, sqlx::Error>> + '_ {
        sqlx::query_as::<_, UserDbModel>(
            r#"
            SELECT id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch(&self.pool)
        .map(|res| res.map(|db_model| db_model.into()))
    }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    #[tracing::instrument(skip(self, new_user))]
    async fn create(&self, new_user: NewUser) -> Result<User, anyhow::Error> {
        // TODO: Switch to sqlx::query_as! macro for compile-time verification once DB is connected
        let user_db = sqlx::query_as::<_, UserDbModel>(
            r#"
            INSERT INTO users (email, password_hash, first_name, middle_name, last_name, suffix)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at
            "#,
        )
        .bind(new_user.email)
        .bind(new_user.password_hash)
        .bind(new_user.first_name)
        .bind(new_user.middle_name)
        .bind(new_user.last_name)
        .bind(new_user.suffix)
        .fetch_one(&self.pool)
        .await?;

        Ok(user_db.into())
    }

    #[tracing::instrument(skip(self))]
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, anyhow::Error> {
        let user_db = sqlx::query_as::<_, UserDbModel>(
            r#"
            SELECT id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user_db.map(|u| u.into()))
    }

    #[tracing::instrument(skip(self))]
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, anyhow::Error> {
        let user_db = sqlx::query_as::<_, UserDbModel>(
            r#"
            SELECT id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user_db.map(|u| u.into()))
    }

    #[tracing::instrument(skip(self))]
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<User>, anyhow::Error> {
        let users_db = sqlx::query_as::<_, UserDbModel>(
            r#"
            SELECT id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let users = users_db.into_iter().map(|u| u.into()).collect();
        Ok(users)
    }

    #[tracing::instrument(skip(self))]
    async fn count(&self) -> Result<i64, anyhow::Error> {
        let result: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM users
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result.0)
    }

    #[tracing::instrument(skip(self, update))]
    async fn update(&self, id: Uuid, update: UpdateUser) -> Result<User, anyhow::Error> {
        // Build dynamic query based on what fields are being updated
        let mut query = String::from("UPDATE users SET ");
        let mut updates = Vec::new();
        let mut param_count = 1;

        if update.email.is_some() {
            updates.push(format!("email = ${}", param_count));
            param_count += 1;
        }
        if update.password_hash.is_some() {
            updates.push(format!("password_hash = ${}", param_count));
            param_count += 1;
        }
        if update.first_name.is_some() {
            updates.push(format!("first_name = ${}", param_count));
            param_count += 1;
        }
        if update.middle_name.is_some() {
            updates.push(format!("middle_name = ${}", param_count));
            param_count += 1;
        }
        if update.last_name.is_some() {
            updates.push(format!("last_name = ${}", param_count));
            param_count += 1;
        }
        if update.suffix.is_some() {
            updates.push(format!("suffix = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err(anyhow::anyhow!("No fields to update"));
        }

        updates.push("updated_at = NOW()".to_string());
        query.push_str(&updates.join(", "));
        query.push_str(&format!(
            " WHERE id = ${} RETURNING id, email, password_hash, first_name, middle_name, last_name, suffix, created_at, updated_at",
            param_count
        ));

        let mut query_builder = sqlx::query_as::<_, UserDbModel>(&query);

        if let Some(email) = update.email {
            query_builder = query_builder.bind(email);
        }
        if let Some(password_hash) = update.password_hash {
            query_builder = query_builder.bind(password_hash);
        }
        if let Some(first_name) = update.first_name {
            query_builder = query_builder.bind(first_name);
        }
        if let Some(middle_name) = update.middle_name {
            query_builder = query_builder.bind(middle_name);
        }
        if let Some(last_name) = update.last_name {
            query_builder = query_builder.bind(last_name);
        }
        if let Some(suffix) = update.suffix {
            query_builder = query_builder.bind(suffix);
        }
        query_builder = query_builder.bind(id);

        let user_db = query_builder.fetch_one(&self.pool).await?;

        Ok(user_db.into())
    }

    #[tracing::instrument(skip(self))]
    async fn delete(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
