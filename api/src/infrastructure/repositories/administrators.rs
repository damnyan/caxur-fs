use crate::domain::administrators::{
    Administrator, AdministratorRepository, NewAdministrator, UpdateAdministrator,
};
use crate::infrastructure::db::DbPool;
use crate::infrastructure::db::models::administrators::AdministratorDbModel;
use async_trait::async_trait;
use uuid::Uuid;

#[derive(Clone)]
pub struct PostgresAdministratorRepository {
    pool: DbPool,
}

impl PostgresAdministratorRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AdministratorRepository for PostgresAdministratorRepository {
    #[tracing::instrument(skip(self, new_admin))]
    async fn create(&self, new_admin: NewAdministrator) -> Result<Administrator, anyhow::Error> {
        let admin_db = sqlx::query_as::<_, AdministratorDbModel>(
            r#"
            INSERT INTO user_administrators (
                first_name, middle_name, last_name, suffix, contact_number, email, password_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, first_name, middle_name, last_name, suffix, contact_number, email, password_hash, email_verified_at, revoked_at, created_at, updated_at, '[]'::jsonb as roles
            "#,
        )
        .bind(new_admin.first_name)
        .bind(new_admin.middle_name)
        .bind(new_admin.last_name)
        .bind(new_admin.suffix)
        .bind(new_admin.contact_number)
        .bind(new_admin.email)
        .bind(new_admin.password_hash)
        .fetch_one(&self.pool)
        .await?;

        Ok(admin_db.into())
    }

    #[tracing::instrument(skip(self))]
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Administrator>, anyhow::Error> {
        let admin_db = sqlx::query_as::<_, AdministratorDbModel>(
            r#"
            SELECT a.id, a.first_name, a.middle_name, a.last_name, a.suffix, a.contact_number, a.email, a.password_hash, a.email_verified_at, a.revoked_at, a.created_at, a.updated_at,
                   COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb) as roles
            FROM user_administrators a
            LEFT JOIN administrator_roles ar ON a.id = ar.administrator_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE a.id = $1
            GROUP BY a.id
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(admin_db.map(|a| a.into()))
    }

    #[tracing::instrument(skip(self))]
    async fn find_by_email(&self, email: &str) -> Result<Option<Administrator>, anyhow::Error> {
        let admin_db = sqlx::query_as::<_, AdministratorDbModel>(
            r#"
            SELECT a.id, a.first_name, a.middle_name, a.last_name, a.suffix, a.contact_number, a.email, a.password_hash, a.email_verified_at, a.revoked_at, a.created_at, a.updated_at,
                   COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb) as roles
            FROM user_administrators a
            LEFT JOIN administrator_roles ar ON a.id = ar.administrator_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE a.email = $1
            GROUP BY a.id
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(admin_db.map(|a| a.into()))
    }

    #[tracing::instrument(skip(self))]
    async fn find_all(
        &self,
        search: Option<String>,
        role_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Administrator>, anyhow::Error> {
        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT a.id, a.first_name, a.middle_name, a.last_name, a.suffix, a.contact_number, a.email, a.password_hash, a.email_verified_at, a.revoked_at, a.created_at, a.updated_at,
                   COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb) as roles
            FROM user_administrators a
            LEFT JOIN administrator_roles ar ON a.id = ar.administrator_id
            LEFT JOIN roles r ON ar.role_id = r.id
            WHERE 1=1
            "#,
        );

        if let Some(ref s) = search {
            query_builder.push(" AND (a.first_name ILIKE ");
            query_builder.push_bind(format!("%{}%", s));
            query_builder.push(" OR a.last_name ILIKE ");
            query_builder.push_bind(format!("%{}%", s));
            query_builder.push(" OR a.email ILIKE ");
            query_builder.push_bind(format!("%{}%", s));
            query_builder.push(")");
        }

        if let Some(r_id) = role_id {
            query_builder.push(" AND EXISTS (SELECT 1 FROM administrator_roles ar2 WHERE ar2.administrator_id = a.id AND ar2.role_id = ");
            query_builder.push_bind(r_id);
            query_builder.push(")");
        }

        query_builder.push(" GROUP BY a.id ORDER BY a.created_at DESC LIMIT ");
        query_builder.push_bind(limit);
        query_builder.push(" OFFSET ");
        query_builder.push_bind(offset);

        let query = query_builder.build_query_as::<AdministratorDbModel>();
        let admins_db = query.fetch_all(&self.pool).await?;

        let admins = admins_db.into_iter().map(|a| a.into()).collect();
        Ok(admins)
    }

    #[tracing::instrument(skip(self))]
    async fn count(
        &self,
        search: Option<String>,
        role_id: Option<Uuid>,
    ) -> Result<i64, anyhow::Error> {
        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT COUNT(*) FROM user_administrators a
            WHERE 1=1
            "#,
        );

        if let Some(ref s) = search {
            query_builder.push(" AND (a.first_name ILIKE ");
            query_builder.push_bind(format!("%{}%", s));
            query_builder.push(" OR a.last_name ILIKE ");
            query_builder.push_bind(format!("%{}%", s));
            query_builder.push(" OR a.email ILIKE ");
            query_builder.push_bind(format!("%{}%", s));
            query_builder.push(")");
        }

        if let Some(r_id) = role_id {
            query_builder.push(" AND EXISTS (SELECT 1 FROM administrator_roles ar2 WHERE ar2.administrator_id = a.id AND ar2.role_id = ");
            query_builder.push_bind(r_id);
            query_builder.push(")");
        }

        let query = query_builder.build_query_as::<(i64,)>();
        let result = query.fetch_one(&self.pool).await?;

        Ok(result.0)
    }

    #[tracing::instrument(skip(self, update))]
    async fn update(
        &self,
        id: Uuid,
        update: UpdateAdministrator,
    ) -> Result<Administrator, anyhow::Error> {
        let mut query = String::from("UPDATE user_administrators SET ");
        let mut updates = Vec::new();
        let mut param_count = 1;

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
        if update.contact_number.is_some() {
            updates.push(format!("contact_number = ${}", param_count));
            param_count += 1;
        }
        if update.email.is_some() {
            updates.push(format!("email = ${}", param_count));
            param_count += 1;
        }
        if update.password_hash.is_some() {
            updates.push(format!("password_hash = ${}", param_count));
            param_count += 1;
        }
        if update.email_verified_at.is_some() {
            updates.push(format!("email_verified_at = ${}", param_count));
            param_count += 1;
        }
        if update.revoked_at.is_some() {
            updates.push(format!("revoked_at = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            // Fetch and return the existing user if no updates are provided,
            // effectively defining a "no-op" update as "return current state"
            return self
                .find_by_id(id)
                .await?
                .ok_or_else(|| anyhow::anyhow!("Administrator not found"));
        }

        updates.push("updated_at = NOW()".to_string());
        query.push_str(&updates.join(", "));
        query.push_str(&format!(
            " WHERE id = ${} RETURNING id, first_name, middle_name, last_name, suffix, contact_number, email, password_hash, email_verified_at, revoked_at, created_at, updated_at, (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)), '[]'::jsonb) FROM administrator_roles ar JOIN roles r ON ar.role_id = r.id WHERE ar.administrator_id = user_administrators.id) as roles",
            param_count
        ));

        let mut query_builder = sqlx::query_as::<_, AdministratorDbModel>(&query);

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
        if let Some(contact_number) = update.contact_number {
            query_builder = query_builder.bind(contact_number);
        }
        if let Some(email) = update.email {
            query_builder = query_builder.bind(email);
        }
        if let Some(password_hash) = update.password_hash {
            query_builder = query_builder.bind(password_hash);
        }
        if let Some(email_verified_at) = update.email_verified_at {
            query_builder = query_builder.bind(email_verified_at);
        }
        if let Some(revoked_at) = update.revoked_at {
            query_builder = query_builder.bind(revoked_at);
        }
        query_builder = query_builder.bind(id);

        let admin_db = query_builder.fetch_one(&self.pool).await?;

        Ok(admin_db.into())
    }

    async fn delete(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let result = sqlx::query("DELETE FROM user_administrators WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    #[tracing::instrument(skip(self))]
    async fn attach_roles(&self, admin_id: Uuid, role_ids: Vec<Uuid>) -> Result<(), anyhow::Error> {
        if role_ids.is_empty() {
            return Ok(());
        }

        let mut query_builder =
            sqlx::QueryBuilder::new("INSERT INTO administrator_roles (administrator_id, role_id) ");

        query_builder.push_values(role_ids, |mut b, role_id| {
            b.push_bind(admin_id);
            b.push_bind(role_id);
        });

        query_builder.push(" ON CONFLICT DO NOTHING");

        let query = query_builder.build();
        query.execute(&self.pool).await?;

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    async fn detach_roles(&self, admin_id: Uuid, role_ids: Vec<Uuid>) -> Result<(), anyhow::Error> {
        if role_ids.is_empty() {
            return Ok(());
        }

        let query =
            "DELETE FROM administrator_roles WHERE administrator_id = $1 AND role_id = ANY($2)";
        sqlx::query(query)
            .bind(admin_id)
            .bind(role_ids)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    async fn get_permissions(
        &self,
        admin_id: Uuid,
    ) -> Result<Vec<crate::domain::permissions::Permission>, anyhow::Error> {
        // Query to get distinct permissions from all roles assigned to the administrator
        let rows = sqlx::query!(
            r#"
            SELECT DISTINCT rp.permission as "permission!: String"
            FROM administrator_roles ar
            JOIN role_permissions rp ON ar.role_id = rp.role_id
            WHERE ar.administrator_id = $1
            "#,
            admin_id
        )
        .fetch_all(&self.pool)
        .await?;

        let permissions = rows
            .into_iter()
            .filter_map(|row| row.permission.parse().ok())
            .collect();

        Ok(permissions)
    }
}
