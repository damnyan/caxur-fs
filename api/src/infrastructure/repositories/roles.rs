use crate::domain::access_scope::AccessScope;
use crate::domain::permissions::Permission;
use crate::domain::roles::{NewRole, Role, RoleRepository, UpdateRole};
use crate::infrastructure::db::DbPool;
use crate::infrastructure::db::models::roles::RoleDbModel;
use async_trait::async_trait;
use uuid::Uuid;

#[derive(Clone)]
pub struct PostgresRoleRepository {
    pool: DbPool,
}

impl PostgresRoleRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl RoleRepository for PostgresRoleRepository {
    #[tracing::instrument(skip(self, new_role))]
    async fn create(&self, new_role: NewRole) -> Result<Role, anyhow::Error> {
        let role_db = sqlx::query_as::<_, RoleDbModel>(
            r#"
            INSERT INTO roles (name, description, scope, group_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, description, scope, group_id, created_at, updated_at
            "#,
        )
        .bind(new_role.name)
        .bind(new_role.description)
        .bind(new_role.scope.to_string())
        .bind(new_role.group_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(role_db.into())
    }

    #[tracing::instrument(skip(self))]
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Role>, anyhow::Error> {
        let role_db = sqlx::query_as::<_, RoleDbModel>(
            r#"
            SELECT id, name, description, scope, group_id, created_at, updated_at
            FROM roles
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(role_db.map(|r| r.into()))
    }

    #[tracing::instrument(skip(self))]
    async fn find_by_name(
        &self,
        name: &str,
        scope: AccessScope,
        group_id: Option<Uuid>,
    ) -> Result<Option<Role>, anyhow::Error> {
        let mut query = String::from(
            "SELECT id, name, description, scope, group_id, created_at, updated_at FROM roles WHERE name = $1 AND scope = $2",
        );
        match group_id {
            Some(_) => query.push_str(" AND group_id = $3"),
            None => query.push_str(" AND group_id IS NULL"),
        }

        let mut query_builder = sqlx::query_as::<_, RoleDbModel>(&query)
            .bind(name)
            .bind(scope.to_string());

        if let Some(gid) = group_id {
            query_builder = query_builder.bind(gid);
        }

        let role_db = query_builder.fetch_optional(&self.pool).await?;

        Ok(role_db.map(|r| r.into()))
    }

    #[tracing::instrument(skip(self))]
    async fn find_all(
        &self,
        scope: AccessScope,
        group_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Role>, anyhow::Error> {
        let mut query = String::from(
            "SELECT id, name, description, scope, group_id, created_at, updated_at FROM roles WHERE scope = $1",
        );
        let mut param_index = 2; // Start after scope

        if group_id.is_some() {
            query.push_str(&format!(" AND group_id = ${}", param_index));
            param_index += 1;
        } else {
            // If group_id is None, we might want to return global roles?
            // Or strict filtering? "group_id IS NULL" implies global/admin roles usually.
            // If the caller passes None, they likely want standard roles.
            // Let's assume strict filtering for now.
            query.push_str(" AND group_id IS NULL");
        }

        query.push_str(&format!(
            " ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
            param_index,
            param_index + 1
        ));

        let mut query_builder = sqlx::query_as::<_, RoleDbModel>(&query).bind(scope.to_string());

        if let Some(gid) = group_id {
            query_builder = query_builder.bind(gid);
        }

        query_builder = query_builder.bind(limit).bind(offset);

        let roles_db = query_builder.fetch_all(&self.pool).await?;

        let roles = roles_db.into_iter().map(|r| r.into()).collect();
        Ok(roles)
    }

    #[tracing::instrument(skip(self))]
    async fn count(&self) -> Result<i64, anyhow::Error> {
        let result: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM roles
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result.0)
    }

    #[tracing::instrument(skip(self, update))]
    async fn update(&self, id: Uuid, update: UpdateRole) -> Result<Role, anyhow::Error> {
        // Build dynamic query based on what fields are being updated
        let mut query = String::from("UPDATE roles SET ");
        let mut updates = Vec::new();
        let mut param_count = 1;

        if update.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }
        if update.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err(anyhow::anyhow!("No fields to update"));
        }

        updates.push("updated_at = NOW()".to_string());
        query.push_str(&updates.join(", "));
        query.push_str(&format!(
            " WHERE id = ${} RETURNING id, name, description, scope, group_id, created_at, updated_at",
            param_count
        ));

        let mut query_builder = sqlx::query_as::<_, RoleDbModel>(&query);

        if let Some(name) = update.name {
            query_builder = query_builder.bind(name);
        }
        if let Some(description) = update.description {
            query_builder = query_builder.bind(description);
        }
        query_builder = query_builder.bind(id);

        let role_db = query_builder.fetch_one(&self.pool).await?;

        Ok(role_db.into())
    }

    #[tracing::instrument(skip(self))]
    async fn delete(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let result = sqlx::query("DELETE FROM roles WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    #[tracing::instrument(skip(self))]
    async fn get_permissions(&self, role_id: Uuid) -> Result<Vec<Permission>, anyhow::Error> {
        let permissions = sqlx::query_scalar::<_, String>(
            "SELECT permission FROM role_permissions WHERE role_id = $1",
        )
        .bind(role_id)
        .fetch_all(&self.pool)
        .await?;

        permissions
            .into_iter()
            .map(|p| p.parse().map_err(|e: String| anyhow::anyhow!(e)))
            .collect()
    }

    async fn attach_permissions(
        &self,
        role_id: Uuid,
        permissions: Vec<Permission>,
    ) -> Result<(), anyhow::Error> {
        if permissions.is_empty() {
            return Ok(());
        }

        // Build bulk INSERT query with ON CONFLICT DO NOTHING to handle duplicates
        let mut query_builder =
            sqlx::QueryBuilder::new("INSERT INTO role_permissions (role_id, permission) ");

        query_builder.push_values(permissions, |mut b, permission| {
            b.push_bind(role_id).push_bind(permission.to_string());
        });

        query_builder.push(" ON CONFLICT (role_id, permission) DO NOTHING");

        query_builder.build().execute(&self.pool).await?;

        Ok(())
    }

    async fn detach_permissions(
        &self,
        role_id: Uuid,
        permissions: Vec<Permission>,
    ) -> Result<(), anyhow::Error> {
        if permissions.is_empty() {
            return Ok(());
        }

        // Convert permissions to strings for the query
        let permission_strings: Vec<String> = permissions.iter().map(|p| p.to_string()).collect();

        sqlx::query("DELETE FROM role_permissions WHERE role_id = $1 AND permission = ANY($2)")
            .bind(role_id)
            .bind(&permission_strings)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}

