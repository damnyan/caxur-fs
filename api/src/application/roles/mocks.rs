#![cfg(test)]

use crate::domain::access_scope::AccessScope;
use crate::domain::permissions::Permission;
use crate::domain::roles::{NewRole, Role, RoleRepository, UpdateRole};
use async_trait::async_trait;
use std::sync::{Arc, Mutex};
use time::OffsetDateTime;
use uuid::Uuid;

pub struct MockRoleRepository {
    pub roles: Arc<Mutex<Vec<Role>>>,
}

impl MockRoleRepository {
    pub fn new() -> Self {
        Self {
            roles: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    pub fn seed(&self, role: Role) {
        self.roles.lock().unwrap().push(role);
    }
}

#[async_trait]
impl RoleRepository for MockRoleRepository {
    async fn create(&self, new_role: NewRole) -> Result<Role, anyhow::Error> {
        let role = Role {
            id: Uuid::new_v4(),
            name: new_role.name,
            description: new_role.description,
            scope: new_role.scope,
            group_id: new_role.group_id,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        };
        self.roles.lock().unwrap().push(role.clone());
        Ok(role)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Role>, anyhow::Error> {
        let guard = self.roles.lock().unwrap();
        Ok(guard.iter().find(|r| r.id == id).cloned())
    }

    async fn find_by_name(
        &self,
        name: &str,
        scope: AccessScope,
        group_id: Option<Uuid>,
    ) -> Result<Option<Role>, anyhow::Error> {
        let guard = self.roles.lock().unwrap();
        Ok(guard
            .iter()
            .find(|r| r.name == name && r.scope == scope && r.group_id == group_id)
            .cloned())
    }

    async fn find_all(
        &self,
        scope: AccessScope,
        group_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Role>, anyhow::Error> {
        let guard = self.roles.lock().unwrap();
        let filtered: Vec<_> = guard
            .iter()
            .filter(|r| r.scope == scope && r.group_id == group_id)
            .cloned()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        Ok(filtered)
    }

    async fn count(&self) -> Result<i64, anyhow::Error> {
        Ok(self.roles.lock().unwrap().len() as i64)
    }

    async fn update(&self, id: Uuid, update: UpdateRole) -> Result<Role, anyhow::Error> {
        let mut guard = self.roles.lock().unwrap();
        if let Some(role) = guard.iter_mut().find(|r| r.id == id) {
            if let Some(name) = update.name {
                role.name = name;
            }
            if let Some(desc) = update.description {
                role.description = Some(desc);
            }
            role.updated_at = OffsetDateTime::now_utc();
            return Ok(role.clone());
        }
        Err(anyhow::anyhow!("Role not found"))
    }

    async fn delete(&self, id: Uuid) -> Result<bool, anyhow::Error> {
        let mut guard = self.roles.lock().unwrap();
        let initial_len = guard.len();
        guard.retain(|r| r.id != id);
        Ok(guard.len() < initial_len)
    }

    async fn get_permissions(&self, _role_id: Uuid) -> Result<Vec<Permission>, anyhow::Error> {
        Ok(vec![])
    }

    async fn attach_permissions(
        &self,
        _role_id: Uuid,
        _permissions: Vec<Permission>,
    ) -> Result<(), anyhow::Error> {
        Ok(())
    }

    async fn detach_permissions(
        &self,
        _role_id: Uuid,
        _permissions: Vec<Permission>,
    ) -> Result<(), anyhow::Error> {
        Ok(())
    }
}
