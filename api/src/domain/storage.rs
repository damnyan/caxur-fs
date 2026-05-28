use async_trait::async_trait;

#[async_trait]
pub trait StorageService: Send + Sync {
    async fn upload(
        &self,
        key: &str,
        bytes: Vec<u8>,
        mime_type: Option<&str>,
    ) -> Result<(), anyhow::Error>;
    async fn move_object(&self, source_key: &str, dest_key: &str) -> Result<(), anyhow::Error>;
    async fn get_presigned_url(
        &self,
        key: &str,
        expires_in_secs: u64,
    ) -> Result<String, anyhow::Error>;
}
