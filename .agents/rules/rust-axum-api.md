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

## 2. Workspace MCP Servers & Tools

To ensure contract correctness and maximize development efficiency, you MUST leverage the following workspace-registered Model Context Protocol (MCP) servers:
- **`caxur-api-docs`**: 
  - Use `search_endpoints` or `get_endpoint_details` to inspect and cross-verify that Axum HTTP handlers, routers, and request/response DTO schemas exactly match the OpenAPI specification.
- **`context7`**:
  - Use `resolve-library-id` and `query-docs` to retrieve targeted, up-to-date documentation on Rust crates, including Axum, SQLx, Tower-HTTP, Tower-Governor, and Serde.

## 3. Project Structure & Layers

1. **Domain (`src/domain/`)**: Pure entities and repository interfaces (Traits). No external dependencies (NO `sqlx`, NO `axum`, NO `utoipa`). `serde`, `time`, `uuid` are allowed.
2. **Application (`src/application/`)**: Business logic, use cases, and commands. Depends only on Domain.
3. **Infrastructure (`src/infrastructure/`)**: Database (SQLx), repository implementations. Depends on Domain.
   - Database models must exist in `src/infrastructure/db/models/`.
   - Must implement `From<*DbModel> for DomainEntity`.
4. **Presentation (`src/presentation/`)**: HTTP handlers, router. Depends on Application.
   - DTOs define the API contracts and must derive `utoipa::ToSchema`.
   - Do NOT use domain entities directly for API requests/responses.
5. **Shared (`src/shared/`)**: Common utilities (like `AppError`, `ValidatedJson`) used across layers.

## 4. Coding Standards & API Design

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

## 5. Implementation Workflow

When adding a new feature, follow this strict order:

1. **Endpoint Permissions (Planning Constraint)**: When creating an implementation plan for a new endpoint, explicitly ask the user which permission(s) should protect the endpoint based on the available permissions in the system.
2. **Domain**: Define Entity struct and Repository Trait.
3. **Infrastructure**: Implement Repository Trait (e.g., `PostgresRepository`) and add/update `DbModel`.
4. **Application**: Create Request DTO (with validation), Use Case struct, and implement `execute` logic.
5. **Presentation**: Create Handler function, use `ValidatedJson`, call Use Case, return `ApiResponse`. Document all public API endpoints using `utoipa` macros.
6. **Router**: Register the new handler.

## 6. Helper & Verification Scripts

- **Verification**: 
  - To verify the API locally, run `scripts/verify.sh` inside the `api` directory (which checks formatting, linting, and tests).
  - To verify the entire monorepo before committing, run `./scripts/verify-all.sh` from the workspace root.
- **Setup**: Run `scripts/setup.sh` to ensure SQLx and the project environment are ready.

## 7. Testing

- **Strict Unit Testing**: Write unit tests for the core logic implemented. We exclusively use unit testing for this project. DO NOT write integration tests.

## 8. Common Mistakes to Avoid

- **Writing Integration Tests**: Attempting to write integration tests (e.g., loading real database connections or starting HTTP listeners in Rust test blocks) instead of focused unit tests.
- **Using Fully Qualified Names (FQN)**: Writing FQN imports like `crate::domain::User::new()` in the middle of functions instead of declaring a `use` statement at the top.
- **Leaking DB Models**: Exposing infrastructure database models directly to handlers or presentation DTOs without mapping them to proper Domain entities first.
- **Bypassing Rate Limiters**: Omitting rate limiting middleware configuration on new routes or placing health-checks inside a rate-limiting tier.
- **Anemic Domain Entities**: Putting all core business validation and state transition logic into handlers or application use cases instead of encapsulating it within the domain entity.

## 9. Temporary File & Lifecycle Policy

- **Clean Repository Guarantee**: If you create a temporary file, diagnostic script, or mock file in this directory to test or validate your changes, **you MUST delete it immediately** after verification to prevent cluttering the repository.
