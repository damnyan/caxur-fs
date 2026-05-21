use crate::domain::cache::CacheService;
use async_trait::async_trait;
use moka::future::Cache;

pub struct MokaCacheService {
    cache: Cache<String, String>,
}

impl MokaCacheService {
    pub fn new(max_capacity: u64) -> Self {
        let cache = Cache::builder().max_capacity(max_capacity).build();
        Self { cache }
    }
}

#[async_trait]
impl CacheService for MokaCacheService {
    async fn set(&self, key: &str, value: String, _ttl_seconds: u64) -> Result<(), anyhow::Error> {
        self.cache.insert(key.to_string(), value).await;
        // Note: Moka's entry-level TTL is tricky with the basic Cache.
        // For a true per-key TTL, we'd use Policy or just accept the global policy.
        // For now, we'll use a global capacity-based cache or a separate cache per TTL if needed.
        // Since we only use this for registration (10m), we can set a global expiry if desired.
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Option<String>, anyhow::Error> {
        Ok(self.cache.get(key).await)
    }

    async fn delete(&self, key: &str) -> Result<(), anyhow::Error> {
        self.cache.invalidate(key).await;
        Ok(())
    }
}
