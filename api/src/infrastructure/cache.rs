use crate::domain::cache::CacheService;
use async_trait::async_trait;
use moka::Expiry;
use moka::future::Cache;
use std::time::{Duration, Instant};

#[derive(Clone, Debug)]
struct CacheEntry {
    value: String,
    ttl: Duration,
    expires_at: Instant,
}

struct PerEntryExpiry;

impl Expiry<String, CacheEntry> for PerEntryExpiry {
    fn expire_after_create(
        &self,
        _key: &String,
        value: &CacheEntry,
        _created_at: Instant,
    ) -> Option<Duration> {
        Some(value.ttl)
    }

    fn expire_after_update(
        &self,
        _key: &String,
        value: &CacheEntry,
        _updated_at: Instant,
        _duration_until_expiry: Option<Duration>,
    ) -> Option<Duration> {
        Some(value.ttl)
    }
}

pub struct MokaCacheService {
    cache: Cache<String, CacheEntry>,
}

impl MokaCacheService {
    pub fn new(max_capacity: u64) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_capacity)
            .expire_after(PerEntryExpiry)
            .build();
        Self { cache }
    }
}

#[async_trait]
impl CacheService for MokaCacheService {
    async fn set(&self, key: &str, value: String, ttl_seconds: u64) -> Result<(), anyhow::Error> {
        let ttl = Duration::from_secs(ttl_seconds);
        let entry = CacheEntry {
            value,
            ttl,
            expires_at: Instant::now() + ttl,
        };
        self.cache.insert(key.to_string(), entry).await;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Option<String>, anyhow::Error> {
        if let Some(entry) = self.cache.get(key).await {
            if Instant::now() < entry.expires_at {
                return Ok(Some(entry.value));
            }
            self.cache.invalidate(key).await;
        }
        Ok(None)
    }

    async fn delete(&self, key: &str) -> Result<(), anyhow::Error> {
        self.cache.invalidate(key).await;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_set_get_delete() {
        let cache = MokaCacheService::new(100);
        cache
            .set("test:key", "hello".to_string(), 60)
            .await
            .unwrap();
        assert_eq!(
            cache.get("test:key").await.unwrap(),
            Some("hello".to_string())
        );

        cache.delete("test:key").await.unwrap();
        assert_eq!(cache.get("test:key").await.unwrap(), None);
    }

    #[tokio::test]
    async fn test_cache_per_entry_ttl_expiration() {
        let cache = MokaCacheService::new(100);
        cache
            .set("short:key", "ephemeral".to_string(), 1)
            .await
            .unwrap();
        assert_eq!(
            cache.get("short:key").await.unwrap(),
            Some("ephemeral".to_string())
        );

        tokio::time::sleep(Duration::from_millis(1100)).await;
        assert_eq!(cache.get("short:key").await.unwrap(), None);
    }

    #[tokio::test]
    async fn test_cache_zero_ttl_expires_immediately() {
        let cache = MokaCacheService::new(100);
        cache
            .set("zero:key", "expired".to_string(), 0)
            .await
            .unwrap();
        assert_eq!(cache.get("zero:key").await.unwrap(), None);
    }
}
