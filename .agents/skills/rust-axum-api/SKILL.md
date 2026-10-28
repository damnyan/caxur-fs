---
name: rust-axum-api
description: Specialized skill for the Rust Axum API project, enforcing strict Clean Architecture layers, Domain-Driven Design, JSON:API compliance, and Axum/SQLx standards.
---

# Rust Axum API Skill

This skill governs development within the `api` project (Rust 2024 edition, Axum 0.8, SQLx 0.8, Tokio 1.x). It enforces strict adherence to Clean Architecture, Domain-Driven Design (DDD), JSON:API v1.1 compliance, and production-grade Rust engineering standards.

## 1. Core Principles

- **Clean Architecture**: Adhere strictly to the dependency rule: `Domain` <- `Application` <- `Infrastructure` <- `Presentation`.
- **Domain-Driven Design (DDD)**: Maintain a rich domain model; avoid anemic models. Encapsulate business logic, use factory methods (e.g., `Claims::new_access_token(...)`), and enforce validity within the entity.
- **KISS, DRY, YAGNI**: Keep implementation simple. Use dependency injection via constructors. Centralize common logic in the `shared` module. Implement only what is strictly necessary.

## 2. Workspace MCP Servers & Tools

To ensure contract correctness and maximize development efficiency, you MUST leverage the following workspace-registered Model Context Protocol (MCP) servers:
- **`caxur-api-docs`**:
  - Use `search_endpoints` or `get_endpoint_details` to inspect and cross-verify that Axum HTTP handlers, routers, and request/response DTO schemas exactly match the OpenAPI specification (`api/openapi.json`).
- **`context7`**:
  - Use `resolve-library-id` and `query-docs` to retrieve targeted, up-to-date documentation on Rust crates, including Axum 0.8, SQLx 0.8, Tower-HTTP, Tower-Governor, and Serde.

## 3. Project Structure & Layers

1. **Domain (`src/domain/`)**: Pure entities and repository interfaces (Traits). No external dependencies (NO `sqlx`, NO `axum`, NO `utoipa`). `serde`, `time`, `uuid` are allowed.
2. **Application (`src/application/`)**: Business logic, use cases, and commands. Depends only on Domain.
3. **Infrastructure (`src/infrastructure/`)**: Database (SQLx), repository implementations. Depends on Domain.
   - Database models must exist in `src/infrastructure/db/models/`.
   - Must implement `From<*DbModel> for DomainEntity`.
4. **Presentation (`src/presentation/`)**: HTTP handlers, router, OpenAPI spec (`src/presentation/openapi.rs`). Depends on Application.
   - DTOs define the API contracts and must derive `utoipa::ToSchema`.
   - Do NOT use domain entities directly for API requests/responses.
5. **Shared (`src/shared/`)**: Common utilities (like `AppError`, `ValidatedJson`, `PageParams`, `Qs`, `JsonApiResponse`) used across layers.

## 4. Coding Standards & API Design

- **Naming Conventions**:
  - Domain Entities: `User`, `Role` (No suffix)
  - Database Models: `UserDbModel` (Suffix: `DbModel`)
  - API Resources: `UserResource`, `PermissionDto` (Suffix: `Resource` or `Dto`)
  - Repositories: `PostgresUserRepository` (Implementation), `UserRepository` (Trait)
- **JSON:API v1.1 Compliance (Strict)**:
  - ALL responses (success and error) MUST strictly follow the JSON:API specification and serve the media type `application/vnd.api+json`. Wrap success responses in `ApiResponse::new(data)` (type aliased to `JsonApiResponse::new(data)`).
  - **Direct `JsonApiResponse` Return**: Handlers MUST return `JsonApiResponse` (or `(StatusCode::CREATED, JsonApiResponse)`) directly without wrapping it in `axum::Json(...)`. Wrapping `JsonApiResponse` in `axum::Json` overrides `JsonApiResponse::into_response` and downgrades the header to `application/json`.
  - **Attributes Isolation**: Never duplicate resource `id` or `type` inside resource `attributes`.
  - **Relationships**: Related data requested via `?include=` MUST be placed in the top-level `included` array. The main resource must reference these inclusions via a standard `relationships` object. NEVER inject related entities into top-level `attributes`.
- **Mandatory Pagination & `Qs<T>` Extractor**:
  - Every API endpoint returning a list of records from the database MUST be paginated strictly using the canonical `crate::shared::pagination::PageParams` (`page[number]` and `page[size]`, capped at `100`).
  - Always extract query parameters containing `PageParams` or bracketed keys using `crate::shared::query::Qs<T>` (`serde_qs::axum::Qs`). NEVER use `axum::extract::Query<T>` (`serde_urlencoded`) for structs containing `PageParams`, as `serde_urlencoded` does not support nested bracketed parameters.
- **Aggregations & Analytics Endpoints (Strict)**:
  - NEVER reuse general resource listing endpoints (`GET /users`, `GET /orders`) to compute summary statistics, counts, or metrics.
  - ALWAYS create dedicated aggregation endpoints following the Dual-Pattern REST standard:
    - **Resource-Specific**: `GET /api/{resources}/statistics` (e.g., `GET /users/statistics`)
    - **Cross-Domain / Global Dashboards**: `GET /api/analytics/{domain}` (e.g., `GET /analytics/dashboard`)
  - Execute SQL aggregate queries (`COUNT(*)`, `SUM()`, `AVG()`, `GROUP BY`) directly at the database layer via SQLx. NEVER load raw entity tables into Rust memory to iterate or calculate stats.
- **Mandatory Date Range Filtering**:
  - Any API query or resource that contains timestamp/date fields MUST accept date range filtering parameters (`from` and `to` in ISO 8601 UTC format, e.g. `?from=2026-01-01T00:00:00Z&to=2026-08-10T23:59:59Z`). Optional preset parameter `period=7d|30d|90d|12m` may be supported as a shortcut.
- **Error Handling, Sanitization & Validation**:
  - Use `AppError` (from `shared/error.rs`) for all errors, mapping to appropriate HTTP status codes.
  - **Strict Error Sanitization**: NEVER leak raw `sqlx::Error`, database table/constraint names, or internal `e.to_string()` details in `500 Internal Server Error` or `503 Service Unavailable` responses. Log full diagnostic context server-side with `tracing::error!` and return a sanitized client-facing message.
  - Use `validator` crate and `ValidatedJson` / `MaybeValidatedJson` extractors from `shared/validation.rs` to automatically validate requests.
  - Always enforce bounded body size limits (`MAX_JSON_BODY_BYTES = 2 * 1024 * 1024`) when reading request bodies via `axum::body::to_bytes`; never pass `usize::MAX`.
  - Normalize incoming email strings at deserialization time using `crate::shared::validation::deserialize_email`.
  - ALL validation errors must return a `422 Unprocessable Entity` status code and be formatted as a JSON:API compliant error object (using `source.pointer` to indicate the specific field).
- **Rate Limiting (3-Tiered Quota System) & `ConnectInfo`**:
  - Endpoints MUST be segregated into 3 tiers based on their function, and the respective middleware layer must be applied to the router:
    - **Auth/Strict**: `auth_rate_limit_layer` (configured via `RATE_LIMIT_AUTH_PER_MINUTE`, default: `10`). For login, registration, password resets.
    - **Public/Guest**: `public_rate_limit_layer` (configured via `RATE_LIMIT_PUBLIC_PER_MINUTE`, default: `60`). For unauthenticated, open endpoints (e.g., fetching a public directory).
    - **Private/Standard**: `api_rate_limit_layer` (configured via `RATE_LIMIT_PER_MINUTE`, default: `300`). For standard data fetching by authenticated users.
  - Health checks and internal monitoring endpoints MUST bypass rate limiting entirely.
  - Serve the router using `app.into_make_service_with_connect_info::<std::net::SocketAddr>()` in `main.rs` so `SmartIpKeyExtractor` can fall back to peer socket IP when proxy headers are absent.
- **Code Style (Google Rust Style Guide Adapted)**:
  - **Import Qualification & Top-of-File `use`**: Place all `use` declarations at the top of the file (or at the top of a `#[cfg(test)] mod tests` block). Never scatter `use` statements inside functions or mid-file between structs, and never write redundant single-segment crate imports (`use tracing;`, `use sqlx;`). Import **types, traits, and macros** directly (`use std::sync::Arc;`, `use uuid::Uuid;`), and qualify **free functions** via their imported parent module (`use std::env; env::var(...)`, `tracing::error!(...)`) rather than writing inline multi-segment paths (`std::env::var(...)`). **Explicit Exemptions**: `#[openapi(paths(...))]` in `src/presentation/openapi.rs`, `#[serde(...)]`/`#[validate(...)]` attribute strings, and Axum routing builders (`axum::routing::{get, post}`).
  - **Wildcard Import Ban**: Wildcard/glob imports (`use foo::*;`) are banned in production code (`clippy::wildcard_imports`). `use super::*;` is permitted exclusively inside `#[cfg(test)] mod tests` blocks.
  - **Local Borrowing Over Unnecessary `Arc`**: Function and method signatures must never accept `&Arc<T>` or `&Arc<dyn Trait>` (double indirection); accept `&T` or `&dyn Trait` instead (passing `.as_ref()` or `&*` at the call site). Local values that do not cross task/thread boundaries must be borrowed rather than wrapped in `Arc`. (`AppState` and `*UseCase` struct fields holding `Arc<dyn *Repository>` / `Arc<dyn *Service>` are the mandated Dependency Injection boundary).
  - **Concrete Types Over Speculative Generics**: Internal `application/` use cases and `presentation/` handlers must use concrete parameter types (`AccessScope`, `&str`, `String`) rather than single-caller generic bounds (`impl Into<AccessScope>`, `impl AsRef<str>`). Shared generic extractors (`ValidatedJson<T>`, `Qs<T>`), response wrappers (`JsonApiResponse<T>`), and ergonomic string builders (`impl Into<String>`) in `src/shared/` are exempt.
  - **Newtype & Error Discipline**: Never implement `Deref` or `DerefMut` on domain or shared newtypes to simulate inheritance, and never use `std::panic::catch_unwind` for normal error control flow.
- **Email Notifications**:
  - ALL email notifications MUST use a uniform internal HTML template implemented in the `infrastructure` layer.
  - Emails MUST include a Header (with branding), a Body (with a prominent CTA button), and a Footer.
  - The Footer MUST include a "Fallback Link" section (e.g., "If the button doesn't work, copy this link...").
  - The Application Name MUST NEVER be hardcoded; it MUST be configurable via the `APP_NAME` environment variable.

## 5. Rust, Tokio, Axum 0.8 & SQLx 0.8 Production Best Practices

- **Tokio Non-Blocking Discipline**:
  - Offload CPU-intensive operations (Argon2 password hashing/verification, heavy cryptographic signing, large compression) to `tokio::task::spawn_blocking`. Never block Tokio worker threads.
  - Never hold `std::sync::MutexGuard` or `std::sync::RwLockGuard` across `.await` points.
  - Maintain graceful shutdown handling (`SIGINT` + `SIGTERM`) in `main.rs`.
- **Axum 0.8 Routing, Extractors & Permission Cache**:
  - Use Axum 0.8 path parameter syntax (`/{id}`, never legacy `/:id`).
  - Place `FromRequestParts` extractors (`State`, `Path`, `Qs`, `HeaderMap`, `Claims`) BEFORE the body-consuming `FromRequest` extractor (`ValidatedJson`, `MaybeValidatedJson`, `Multipart`), which must always be the final handler argument.
  - When protecting admin routes with `check_permissions`, remember `.route_layer` wraps only routes registered before it (or merge pre-layered sub-routers).
  - Any handler that mutates roles, role-permission assignments, or administrator role assignments MUST invalidate `state.admin_permissions_cache` (`invalidate(&id)` or `invalidate_all()`).
- **Panic-Free & Safe Production Code (`[lints]` Enforced)**:
  - `.unwrap()`, `.expect()`, `dbg!()`, `todo!()`, `unimplemented!()`, and `unsafe` blocks are strictly forbidden in non-test production code (`src/**` outside `#[cfg(test)]`) and enforced at compile time via `[lints.rust]` (`unsafe_code = "forbid"`) and `[lints.clippy]` in `api/Cargo.toml` paired with `api/clippy.toml` (`allow-unwrap-in-tests = true`, `allow-expect-in-tests = true`, `allow-dbg-in-tests = true`). Never add ad-hoc `#[allow(clippy::...)]` suppressions without an inline justification comment. Propagate errors with `?`, `ok_or_else`, or `if let Some(...)`, and return `anyhow::Result<()>` from `main`.
- **SQLx 0.8 & Observability**:
  - Wrap multi-step database writes in explicit SQLx transactions (`let mut tx = self.pool.begin().await?; ... tx.commit().await?;`).
  - Never interpolate user-controlled strings into dynamic SQL (`ORDER BY`, filter columns) without strict enum/whitelist validation.
  - Bound list queries (`page[size] <= 100`) or stream large internal cursors with `.fetch(&self.pool)` instead of unbounded `.fetch_all(&self.pool)`.
  - Annotate use-case `execute` methods with `#[tracing::instrument(skip(self, ...))]` and explicitly `skip` passwords, tokens, and PII payloads.

## 6. Implementation Workflow

When adding or modifying a feature, follow this strict order:

1. **Endpoint Permissions (Planning Constraint)**: When creating an implementation plan for a new endpoint, the AI MUST explicitly ask the user which permission(s) should protect the endpoint based on the available permissions in the system.
2. **Domain**: Define Entity struct and Repository Trait.
3. **Infrastructure**: Implement Repository Trait (e.g., `PostgresRepository`) and add/update `DbModel`.
4. **Application**: Create Request DTO (with validation), Use Case struct, and implement `execute` logic.
5. **Presentation**: Create Handler function, use `ValidatedJson` / `Qs`, call Use Case, return `ApiResponse` directly (without `axum::Json`). Document all public API endpoints using `utoipa` macros.
6. **Router**: Register the new handler with appropriate rate-limit and permission layers.
7. **OpenAPI Spec Sync (`openapi.rs` & `api/openapi.json`)**: Register any new or modified `#[utoipa::path]` handlers and `ToSchema` DTOs in `src/presentation/openapi.rs`, and run `cargo test --lib` to automatically regenerate `api/openapi.json` via the `generate_openapi_json` unit test.

## 7. Helper & Verification Scripts

- **Verification**:
  - To verify the API locally, run `cargo fmt --all -- --check && cargo clippy --all-targets -- -D warnings && cargo test --lib` inside the `api` directory.
  - To verify the entire monorepo before committing, run `./scripts/verify-all.sh` from the workspace root.
- **Setup**: Run `scripts/setup.sh` to ensure SQLx and the project environment are ready.

## 8. Testing

- **Strict Unit Testing**: The AI MUST ALWAYS write unit tests for the core logic implemented. We exclusively use unit testing for this project. DO NOT write integration tests.

## 9. Common Mistakes to Avoid

- **Wrapping `JsonApiResponse` in `axum::Json`**: Returning `Ok(axum::Json(ApiResponse::new(...)))` instead of `Ok(ApiResponse::new(...))`, which overwrites `Content-Type: application/vnd.api+json` with `application/json`.
- **Using `axum::extract::Query` with `PageParams`**: Using `Query<T>` instead of `crate::shared::query::Qs<T>` on endpoints accepting `page[number]` and `page[size]`.
- **Forgetting to Invalidate `admin_permissions_cache`**: Modifying roles or role permissions without invalidating `state.admin_permissions_cache`.
- **Leaking Internal Errors in `500`/`503` Responses**: Returning raw `sqlx::Error` or `e.to_string()` details to API clients instead of logging via `tracing::error!` and returning a sanitized message.
- **Using `.unwrap()` / `.expect()` in Production Code**: Introducing panic paths outside `#[cfg(test)]`.
- **Writing Integration Tests**: Attempting to write integration tests (e.g., loading real database connections or starting HTTP listeners in Rust test blocks) instead of focused unit tests.
- **Using Inline Multi-Segment FQN Paths, Wildcard Imports, or Mid-File `use`**: Writing inline `std::env::var` / `uuid::Uuid` paths in function bodies, using wildcard imports (`use ...::*;`) outside `#[cfg(test)]`, or placing `use` declarations mid-file instead of at the top of the file.
- **Passing `&Arc<T>` / `&Arc<dyn Trait>` Parameters or Speculative Generics**: Accepting `&Arc<dyn Repository>` instead of `&dyn Repository` on borrowing helper/validation methods, or adding single-type generic bounds (`impl Into<AccessScope>`) on application use cases.
- **Leaking DB Models**: Exposing infrastructure database models directly to handlers or presentation DTOs without mapping them to proper Domain entities first.
- **Bypassing Rate Limiters**: Omitting rate limiting middleware configuration on new routes or placing health-checks inside a rate-limiting tier.
- **Anemic Domain Entities**: Putting all core business validation and state transition logic into handlers or application use cases instead of encapsulating it within the domain entity.
- **Reusing Listing Endpoints for Analytics**: Fetching or returning paged entity listings when the client requested summary statistics or dashboard KPIs.
- **Omitting Date Range Filters**: Failing to implement `from` and `to` date range query parameters on resource endpoints that include timestamp columns.

## 10. Temporary File & Lifecycle Policy

- **Clean Repository Guarantee**: If you create a temporary file, diagnostic script, or mock file in this directory to test or validate your changes, **you MUST delete it immediately** after verification to prevent cluttering the repository.
