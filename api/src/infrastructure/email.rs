use async_trait::async_trait;
use lettre::{
    message::header::ContentType, transport::smtp::authentication::Credentials, Message,
    AsyncTransport, AsyncSmtpTransport, Tokio1Executor
};
use tracing;

#[async_trait]
pub trait EmailService: Send + Sync {
    async fn send_email(&self, to: &str, subject: &str, body: &str) -> Result<(), anyhow::Error>;
}

pub struct SmtpEmailService {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from_email: String,
}

impl SmtpEmailService {
    pub fn new(
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_email: String,
    ) -> Result<Self, anyhow::Error> {
        let creds = Credentials::new(username.to_string(), password.to_string());
        
        let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)?
            .port(port)
            .credentials(creds)
            .build();
            
        Ok(Self { mailer, from_email })
    }
}

#[async_trait]
impl EmailService for SmtpEmailService {
    async fn send_email(&self, to: &str, subject: &str, body: &str) -> Result<(), anyhow::Error> {
        let email = Message::builder()
            .from(self.from_email.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .header(ContentType::TEXT_HTML)
            .body(String::from(body))?;

        match self.mailer.send(email).await {
            Ok(_) => {
                tracing::info!("Email sent successfully to {}", to);
                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to send email to {}: {:?}", to, e);
                Err(anyhow::anyhow!("Failed to send email: {:?}", e))
            }
        }
    }
}
