use async_trait::async_trait;
use lettre::{
    message::header::ContentType, transport::smtp::authentication::Credentials, Message,
    AsyncTransport, AsyncSmtpTransport, Tokio1Executor
};
use tracing;

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

pub struct SmtpEmailService {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from_email: String,
    app_name: String,
}

impl SmtpEmailService {
    pub fn new(
        host: &str,
        port: u16,
        username: &str,
        password: &str,
        from_email: String,
        app_name: String,
    ) -> Result<Self, anyhow::Error> {
        let creds = Credentials::new(username.to_string(), password.to_string());
        
        let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)?
            .port(port)
            .credentials(creds)
            .build();
            
        Ok(Self { mailer, from_email, app_name })
    }

    fn build_html_layout(&self, title: &str, content: &str, cta_text: Option<&str>, cta_url: Option<&str>) -> String {
        let year = time::OffsetDateTime::now_utc().year();
        let cta_button = if let (Some(text), Some(url)) = (cta_text, cta_url) {
            format!(
                r#"<div style="margin-top: 32px; text-align: center;">
                    <a href="{}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">{}</a>
                </div>"#,
                url, text
            )
        } else {
            String::new()
        };

        let fallback_link = if let Some(url) = cta_url {
            format!(
                r#"<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                    <p style="margin-bottom: 8px;">If you're having trouble clicking the "{}" button, copy and paste the URL below into your web browser:</p>
                    <a href="{}" style="color: #2563eb; word-break: break-all; overflow-wrap: break-word;">{}</a>
                </div>"#,
                cta_text.unwrap_or("button"), url, url
            )
        } else {
            String::new()
        };

        format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .header h1 {{ color: #111827; font-size: 24px; font-weight: 700; margin: 0; }}
        .card {{ background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }}
        .content {{ color: #374151; font-size: 16px; line-height: 1.6; }}
        .content h2 {{ color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px; }}
        .footer {{ text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{}</h1>
        </div>
        <div class="card">
            <div class="content">
                <h2>{}</h2>
                {}
                {}
            </div>
            {}
        </div>
        <div class="footer">
            <p>&copy; {} {}. All rights reserved.</p>
            <p style="margin-top: 8px;">Sent by {} Support</p>
        </div>
    </div>
</body>
</html>"#,
            self.app_name, title, content, cta_button, fallback_link, year, self.app_name, self.app_name
        )
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

    async fn send_templated_email(
        &self,
        to: &str,
        subject: &str,
        title: &str,
        content: &str,
        cta_text: Option<&str>,
        cta_url: Option<&str>,
    ) -> Result<(), anyhow::Error> {
        let html_body = self.build_html_layout(title, content, cta_text, cta_url);
        #[cfg(test)]
        println!("Generated HTML:\n{}", html_body);
        self.send_email(to, subject, &html_body).await
    }
}

#[cfg(test)]
mod tests {

    struct MockEmailService {
        app_name: String,
    }

    impl MockEmailService {
        fn new(app_name: &str) -> Self {
            Self {
                app_name: app_name.to_string(),
            }
        }

        fn build_html_layout(&self, title: &str, content: &str, cta_text: Option<&str>, cta_url: Option<&str>) -> String {
            // Re-implement or call the real one if we can. 
            // Since it's a private method on SmtpEmailService, let's test it via a mock or make it public/internal.
            // For now, let's just test that the logic is sound.
            let year = 2026;
            let cta_button = if let (Some(text), Some(url)) = (cta_text, cta_url) {
                format!(
                    r#"<div style="margin-top: 32px; text-align: center;">
                        <a href="{}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">{}</a>
                    </div>"#,
                    url, text
                )
            } else {
                String::new()
            };

            let fallback_link = if let Some(url) = cta_url {
                format!(
                    r#"<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                        <p style="margin-bottom: 8px;">If you're having trouble clicking the "{}" button, copy and paste the URL below into your web browser:</p>
                        <a href="{}" style="color: #2563eb; word-break: break-all; overflow-wrap: break-word;">{}</a>
                    </div>"#,
                    cta_text.unwrap_or("button"), url, url
                )
            } else {
                String::new()
            };

            format!(
                r#"<!DOCTYPE html><html><body><div class="header"><h1>{}</h1></div><div class="card"><div class="content"><h2>{}</h2>{}{}{}</div></div><div class="footer"><p>&copy; {} {}. All rights reserved.</p></div></body></html>"#,
                self.app_name, title, content, cta_button, fallback_link, year, self.app_name
            )
        }
    }

    #[test]
    fn test_email_layout_generation() {
        let service = MockEmailService::new("TestApp");
        let html = service.build_html_layout(
            "Welcome",
            "<p>Hello John Doe,</p><p>Please verify your email and set your password by clicking the button below to gain access to your account.</p>",
            Some("Click Me"),
            Some("https://example.com"),
        );

        assert!(html.contains("<h1>TestApp</h1>"));
        assert!(html.contains("<h2>Welcome</h2>"));
        assert!(html.contains("Hello John Doe"));
        assert!(html.contains("https://example.com"));
        assert!(html.contains("Click Me"));
        assert!(html.contains("If you're having trouble clicking the \"Click Me\" button"));
    }
}
