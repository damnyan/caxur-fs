use crate::infrastructure::state::AppState;
use crate::presentation::extractors::AuthUser;
use crate::shared::error::{AppError, ErrorResponse};
use crate::shared::response::{JsonApiResource, JsonApiResponse};
use axum::{
    Json,
    extract::{Multipart, State},
    http::StatusCode,
};
use uuid::Uuid;

pub const ALLOWED_EXTENSIONS: &[&str] = &[
    // Images
    "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tiff",
    // Documents & Text
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods", "odp",
    // Archives
    "zip", "tar", "gz", "7z", "rar", // Audio / Video
    "mp3", "wav", "ogg", "mp4", "webm",
];

pub const BLOCKED_EXTENSIONS: &[&str] = &[
    "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "js", "mjs", "cjs", "ts", "php", "py", "rb",
    "pl", "com", "scr", "msi", "bin", "jar", "app",
];

pub fn validate_file_extension(ext: &str) -> Result<(), &'static str> {
    let lower_ext = ext.to_lowercase();
    if BLOCKED_EXTENSIONS.contains(&lower_ext.as_str()) {
        return Err("Executable and script files are strictly blocked for security reasons");
    }
    if !ALLOWED_EXTENSIONS.contains(&lower_ext.as_str()) {
        return Err(
            "Unsupported file type. Allowed formats: images, documents (PDF, Office, text, CSV), and archives",
        );
    }
    Ok(())
}

pub fn infer_mime_type(ext: &str, provided_mime: Option<String>) -> String {
    if let Some(mime) = provided_mime.filter(|m| !m.is_empty() && m != "application/octet-stream") {
        return mime;
    }
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "png" => "image/png".to_string(),
        "gif" => "image/gif".to_string(),
        "webp" => "image/webp".to_string(),
        "svg" => "image/svg+xml".to_string(),
        "pdf" => "application/pdf".to_string(),
        "txt" => "text/plain".to_string(),
        "csv" => "text/csv".to_string(),
        "zip" => "application/zip".to_string(),
        "tar" => "application/x-tar".to_string(),
        "gz" => "application/gzip".to_string(),
        "doc" => "application/msword".to_string(),
        "docx" => {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()
        }
        "xls" => "application/vnd.ms-excel".to_string(),
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".to_string(),
        "ppt" => "application/vnd.ms-powerpoint".to_string(),
        "pptx" => {
            "application/vnd.openxmlformats-officedocument.presentationml.presentation".to_string()
        }
        _ => "application/octet-stream".to_string(),
    }
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UploadedFileResource {
    pub storage_key: String,
    pub url: String,
    pub file_name: String,
    pub file_size: usize,
    pub mime_type: String,
    pub extension: String,
}

/// Generic authenticated file upload handler
/// Accepts a multipart form file, uploads to temp storage, and returns presigned URL.
#[utoipa::path(
    post,
    path = "/api/v1/upload",
    responses(
        (status = 201, description = "File uploaded successfully to temp storage", body = JsonApiResponse<JsonApiResource<UploadedFileResource>>),
        (status = 400, description = "Invalid file or payload", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse),
        (status = 422, description = "Validation error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "Client / Upload"
)]
pub async fn upload_file(
    State(state): State<AppState>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<
    (
        StatusCode,
        Json<JsonApiResponse<JsonApiResource<UploadedFileResource>>>,
    ),
    AppError,
> {
    let mut file_bytes = Vec::new();
    let mut file_name = String::new();
    let mut content_type = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::ValidationError(vec![crate::shared::error::FieldError::new(
            "file",
            e.to_string(),
        )])
    })? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" || name == "image" || name == "document" || name == "attachment" {
            file_name = field.file_name().unwrap_or("file").to_string();
            content_type = field.content_type().map(|c| c.to_string());
            file_bytes = field
                .bytes()
                .await
                .map_err(|e| {
                    AppError::ValidationError(vec![crate::shared::error::FieldError::new(
                        "file",
                        e.to_string(),
                    )])
                })?
                .to_vec();
            break;
        }
    }

    if file_bytes.is_empty() {
        return Err(AppError::ValidationError(vec![
            crate::shared::error::FieldError::new("file", "File is empty or missing"),
        ]));
    }

    // Body limit safety check
    let max_upload_size_mb: usize = std::env::var("MAX_UPLOAD_SIZE_MB")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(10);
    let max_bytes = max_upload_size_mb * 1024 * 1024;
    if file_bytes.len() > max_bytes {
        return Err(AppError::ValidationError(vec![
            crate::shared::error::FieldError::new(
                "file",
                format!(
                    "File size exceeds maximum allowed limit of {} MB",
                    max_upload_size_mb
                ),
            ),
        ]));
    }

    // Extract extension
    let ext = std::path::Path::new(&file_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("bin")
        .to_lowercase();

    // Validate extension
    if let Err(msg) = validate_file_extension(&ext) {
        return Err(AppError::ValidationError(vec![
            crate::shared::error::FieldError::new("file", msg),
        ]));
    }

    let mime_type = infer_mime_type(&ext, content_type.clone());

    // Generate unique storage key in temp folder
    let uuid = Uuid::new_v4();
    let storage_key = format!("tmp/{}.{}", uuid, ext);

    // Upload to storage
    state
        .storage_service
        .upload(&storage_key, file_bytes.clone(), Some(&mime_type))
        .await
        .map_err(|e| {
            tracing::error!("Failed to upload file to storage: {}", e);
            AppError::InternalServerError(e)
        })?;

    // Generate immediate presigned URL for preview/download
    let presigned_url = state
        .storage_service
        .get_presigned_url(&storage_key, 3600)
        .await
        .map_err(|e| {
            tracing::error!("Failed to generate presigned URL for upload: {}", e);
            AppError::InternalServerError(e)
        })?;

    let data = UploadedFileResource {
        storage_key,
        url: presigned_url,
        file_name,
        file_size: file_bytes.len(),
        mime_type,
        extension: ext,
    };

    let resource = JsonApiResource::new("uploads", uuid.to_string(), data);

    Ok((StatusCode::CREATED, Json(JsonApiResponse::new(resource))))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_allowed_extensions() {
        assert!(validate_file_extension("jpg").is_ok());
        assert!(validate_file_extension("PNG").is_ok());
        assert!(validate_file_extension("pdf").is_ok());
        assert!(validate_file_extension("docx").is_ok());
        assert!(validate_file_extension("xlsx").is_ok());
        assert!(validate_file_extension("csv").is_ok());
        assert!(validate_file_extension("txt").is_ok());
        assert!(validate_file_extension("zip").is_ok());
    }

    #[test]
    fn test_validate_blocked_executable_extensions() {
        assert!(validate_file_extension("exe").is_err());
        assert!(validate_file_extension("sh").is_err());
        assert!(validate_file_extension("bat").is_err());
        assert!(validate_file_extension("php").is_err());
        assert!(validate_file_extension("py").is_err());
        assert!(validate_file_extension("js").is_err());
    }

    #[test]
    fn test_validate_disallowed_unknown_extension() {
        assert!(validate_file_extension("unknownext123").is_err());
    }

    #[test]
    fn test_infer_mime_type() {
        assert_eq!(infer_mime_type("pdf", None), "application/pdf");
        assert_eq!(infer_mime_type("png", None), "image/png");
        assert_eq!(
            infer_mime_type("pdf", Some("application/custom-pdf".to_string())),
            "application/custom-pdf"
        );
        assert_eq!(
            infer_mime_type("xyz", Some("application/octet-stream".to_string())),
            "application/octet-stream"
        );
    }
}
