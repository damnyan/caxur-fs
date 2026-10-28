use async_trait::async_trait;

#[async_trait]
pub trait EmailService: Send + Sync {
    async fn send_email(&self, to: &str, subject: &str, body: &str) -> Result<(), anyhow::Error>;
    async fn send_templated_email(
        &self,
        to: &str,
        subject: &str,
        title: &str,
        content: &str,
        cta_text: Option<&str>,
        cta_url: Option<&str>,
    ) -> Result<(), anyhow::Error>;
}
