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

#[derive(serde::Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UploadedFileResource {
    pub face_photo: String,
    pub face_photo_url: String,
}

/// Upload face photo handler
/// Accepts a multipart form file, uploads to S3 /tmp directory, and returns presigned URL.
#[utoipa::path(
    post,
    path = "/api/v1/upload",
    responses(
        (status = 201, description = "File uploaded successfully to temp storage", body = JsonApiResponse<JsonApiResource<UploadedFileResource>>),
        (status = 400, description = "Invalid file or payload", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse)
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
        if name == "file" || name == "image" {
            file_name = field.file_name().unwrap_or("image.jpg").to_string();
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

    // Basic MIME type / extension validation
    let ext = std::path::Path::new(&file_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("jpg");

    let is_valid_image = matches!(
        ext.to_lowercase().as_str(),
        "jpg" | "jpeg" | "png" | "gif" | "webp"
    );

    if !is_valid_image {
        return Err(AppError::ValidationError(vec![
            crate::shared::error::FieldError::new(
                "file",
                "Invalid image file type. Supported: jpg, jpeg, png, gif, webp",
            ),
        ]));
    }

    // Generate a unique S3 key in the temp folder
    let uuid = Uuid::new_v4();
    let s3_key = format!("tmp/{}.{}", uuid, ext);

    // Upload to S3
    state
        .storage_service
        .upload(&s3_key, file_bytes, content_type.as_deref())
        .await
        .map_err(|e| {
            tracing::error!("Failed to upload face photo to S3: {}", e);
            AppError::InternalServerError(e)
        })?;

    // Generate immediate presigned URL for frontend preview
    let presigned_url = state
        .storage_service
        .get_presigned_url(&s3_key, 3600)
        .await
        .map_err(|e| {
            tracing::error!("Failed to generate presigned URL for upload: {}", e);
            AppError::InternalServerError(e)
        })?;

    let data = UploadedFileResource {
        face_photo: s3_key,
        face_photo_url: presigned_url,
    };

    let resource = JsonApiResource::new("uploads", uuid.to_string(), data);

    Ok((StatusCode::CREATED, Json(JsonApiResponse::new(resource))))
}
