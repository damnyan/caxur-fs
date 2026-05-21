---
trigger: glob
globs: ["api/**/*.rs"]
description: "Rules for the Rust Axum API project, enforcing Clean Architecture layers, Domain-Driven Design, JSON:API compliance, and Axum/SQLx standards."
---

# Rust Axum API Rules

This rule governs all development within the `api` subdirectory. It enforces strict adherence to Clean Architecture, Domain-Driven Design (DDD), JSON:API compliance, and the project's specific technology stack.

## 1. Core Principles

- **Clean Architecture**: Adhere strictly to the dependency rule: `Domain` <- `Application` <- `Infrastructure` <- `Presentation`.
- **Domain-Driven Design (DDD)**: Maintain a rich domain model; avoid anemic models. Encapsulate business logic, use factory methods (e.g., `Claims::new_access_token(...)`), and enforce validity within the entity.
- **KISS, DRY, YAGNI**: Keep implementation simple. Use dependency injection via constructors. Centralize common logic in the `shared` module. Implement only what is strictly necessary.

## 2. Project Structure & Layers

1. **Domain (`src/domain/`)**: Pure entities and repository interfaces (Traits). No external dependencies (NO `sqlx`, NO `axum`, NO `utoipa`). `serde`, `time`, `uuid` are allowed.
2. **Application (`src/application/`)**: Business logic, use cases, and commands. Depends only on Domain.
3. **Infrastructure (`src/infrastructure/`)**: Database (SQLx), repository implementations. Depends on Domain.
   - Database models must exist in `src/infrastructure/db/models/`.
   - Must implement `From<*DbModel> for DomainEntity`.
4. **Presentation (`src/presentation/`)**: HTTP handlers, router. Depends on Application.
   - DTOs define the API contracts and must derive `utoipa::ToSchema`.
   - Do NOT use domain entities directly for API requests/responses.
5. **Shared (`src/shared/`)**: Common utilities (like `AppError`, `ValidatedJson`) used across layers.

## 3. Coding Standards & API Design

- **Naming Conventions**:
  - Domain Entities: `User`, `Role` (No suffix)
  - Database Models: `UserDbModel` (Suffix: `DbModel`)
  - API Resources: `UserResource`, `PermissionDto` (Suffix: `Resource` or `Dto`)
  - Repositories: `PostgresUserRepository` (Implementation), `UserRepository` (Trait)
- **JSON:API Compliance (Strict)**: 
  - ALL responses (success and error) MUST strictly follow the JSON:API specification. Wrap success responses in `ApiResponse::new(data)`.
  - **Relationships**: Related data requested via `?include=` MUST be placed in the top-level `included` array. The main resource must reference these inclusions via a standard `relationships` object. NEVER inject related entities into top-level `attributes`.
- **Mandatory Pagination**: Every API endpoint returning a list of records from the database MUST be paginated strictly using the JSON:API standard parameters: `page[number]` and `page[size]`.
- **Error Handling & Validation**:
  - Use `AppError` (from `shared/error.rs`) for all errors, mapping to appropriate HTTP status codes.
  - Use `validator` crate and `ValidatedJson` extractor from `shared` to automatically validate requests.
  - ALL validation errors must return a `422 Unprocessable Entity` status code and be formatted as a JSON:API compliant error object (using `source.pointer` to indicate the specific field).
- **Rate Limiting (3-Tiered Quota System)**:
  - Endpoints MUST be segregated into 3 tiers based on their function, and the respective middleware layer must be applied to the router:
    - **Auth/Strict**: `auth_rate_limit_layer` (configured via `RATE_LIMIT_AUTH_PER_MINUTE`, default: `10`). For login, registration, password resets.
    - **Public/Guest**: `public_rate_limit_layer` (configured via `RATE_LIMIT_PUBLIC_PER_MINUTE`, default: `60`). For unauthenticated, open endpoints (e.g., fetching a public directory).
    - **Private/Standard**: `api_rate_limit_layer` (configured via `RATE_LIMIT_PER_MINUTE`, default: `300`). For standard data fetching by authenticated users.
  - Health checks and internal monitoring endpoints MUST bypass rate limiting entirely.
- **Code Style**:
  - **No Fully Qualified Names (FQN)**: Always import types, functions, and modules at the top of the file. (e.g., `use crate::domain::User;` instead of `crate::domain::User::new()`).
- **Email Notifications**:
  - ALL email notifications MUST use a uniform internal HTML template implemented in the `infrastructure` layer.
  - Emails MUST include a Header (with branding), a Body (with a prominent CTA button), and a Footer.
  - The Footer MUST include a "Fallback Link" section (e.g., "If the button doesn't work, copy this link...").
  - The Application Name MUST NEVER be hardcoded; it MUST be configurable via the `APP_NAME` environment variable.

## 4. Implementation Workflow

When adding a new feature, follow this strict order:

1. **Endpoint Permissions (Planning Constraint)**: When creating an implementation plan for a new endpoint, explicitly ask the user which permission(s) should protect the endpoint based on the available permissions in the system.
2. **Domain**: Define Entity struct and Repository Trait.
3. **Infrastructure**: Implement Repository Trait (e.g., `PostgresRepository`) and add/update `DbModel`.
4. **Application**: Create Request DTO (with validation), Use Case struct, and implement `execute` logic.
5. **Presentation**: Create Handler function, use `ValidatedJson`, call Use Case, return `ApiResponse`. Document all public API endpoints using `utoipa` macros.
6. **Router**: Register the new handler.

## 5. Testing & Helper Scripts

- **Strict Unit Testing**: Write unit tests for the core logic implemented. We exclusively use unit testing for this project. DO NOT write integration tests.
- **Temporary Files**: If you create a file for testing, debugging, or validation, you MUST delete that file after its usage is complete or after the task is done to prevent cluttering the repository.
