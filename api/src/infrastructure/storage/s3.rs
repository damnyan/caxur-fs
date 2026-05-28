use crate::domain::storage::StorageService;
use async_trait::async_trait;
use aws_sdk_s3::presigning::PresigningConfig;
use std::time::Duration;

#[derive(Clone)]
pub struct S3StorageService {
    client: aws_sdk_s3::Client,
    bucket: String,
}

impl Default for S3StorageService {
    fn default() -> Self {
        Self::new()
    }
}

impl S3StorageService {
    pub fn new() -> Self {
        let bucket = std::env::var("AWS_S3_BUCKET").unwrap_or_else(|_| "caxur-uploads".to_string());

        let endpoint = std::env::var("AWS_S3_ENDPOINT").ok();
        let region = aws_sdk_s3::config::Region::new(
            std::env::var("AWS_S3_REGION").unwrap_or_else(|_| "us-east-1".to_string()),
        );

        let credentials = aws_sdk_s3::config::Credentials::new(
            std::env::var("AWS_ACCESS_KEY_ID").unwrap_or_else(|_| "minioadmin".to_string()),
            std::env::var("AWS_SECRET_ACCESS_KEY").unwrap_or_else(|_| "minioadmin".to_string()),
            None,
            None,
            "Static",
        );

        let mut config_builder = aws_sdk_s3::config::Builder::new()
            .region(region)
            .credentials_provider(credentials)
            .behavior_version(aws_sdk_s3::config::BehaviorVersion::latest());

        if let Some(ep) = endpoint {
            config_builder = config_builder.endpoint_url(ep);
            config_builder = config_builder.force_path_style(true);
        }

        let client = aws_sdk_s3::Client::from_conf(config_builder.build());

        Self { client, bucket }
    }

    pub async fn init_bucket(&self) -> Result<(), anyhow::Error> {
        // Check if bucket exists, if not, create it
        let head_res = self.client.head_bucket().bucket(&self.bucket).send().await;
        if head_res.is_err() {
            tracing::info!("Bucket {} does not exist, creating it...", self.bucket);
            self.client
                .create_bucket()
                .bucket(&self.bucket)
                .send()
                .await
                .map_err(|e| anyhow::anyhow!("Failed to create bucket: {}", e))?;
            tracing::info!("Bucket {} created successfully.", self.bucket);
        }
        Ok(())
    }
}

#[async_trait]
impl StorageService for S3StorageService {
    async fn upload(
        &self,
        key: &str,
        bytes: Vec<u8>,
        mime_type: Option<&str>,
    ) -> Result<(), anyhow::Error> {
        let mut put = self
            .client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(bytes.into());
        if let Some(mime) = mime_type {
            put = put.content_type(mime);
        }
        put.send()
            .await
            .map_err(|e| anyhow::anyhow!("S3 upload error: {}", e))?;
        Ok(())
    }

    async fn move_object(&self, source_key: &str, dest_key: &str) -> Result<(), anyhow::Error> {
        // 1. Copy object from source to dest
        let copy_source = format!("{}/{}", self.bucket, source_key);
        self.client
            .copy_object()
            .bucket(&self.bucket)
            .copy_source(copy_source)
            .key(dest_key)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("S3 copy error: {}", e))?;

        // 2. Delete source object
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(source_key)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("S3 delete error: {}", e))?;

        Ok(())
    }

    async fn get_presigned_url(
        &self,
        key: &str,
        expires_in_secs: u64,
    ) -> Result<String, anyhow::Error> {
        let presigned_req = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(PresigningConfig::expires_in(Duration::from_secs(expires_in_secs)).unwrap())
            .await
            .map_err(|e| anyhow::anyhow!("Presigning error: {}", e))?;

        Ok(presigned_req.uri().to_string())
    }
}
