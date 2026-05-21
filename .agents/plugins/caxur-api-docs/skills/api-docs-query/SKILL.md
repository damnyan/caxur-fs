---
name: api-docs-query
description: "Query and utilize Caxur's local OpenAPI schema for endpoint discovery, contract validation, and TypeScript integration code generation."
---

# Caxur API Documentation & Integration Skill

This skill guides the agent on when and how to utilize the custom `caxur-api-docs` workspace-level plugin to consult Caxur's OpenAPI schema, verify endpoint behaviors, and generate front-end integration types.

## 1. Core Guidelines

- **Always Query for Endpoint Contracts**: When building or updating front-end API integrations in Next.js (`client/**/*`) or Vite React (`admin/**/*`), always query the `caxur-api-docs` server instead of guessing endpoint paths, URL parameters, or request/response payloads.
- **Generate Safe TypeScript Wrappers**: Utilize the `generate_typescript_types` tool to create complete, type-safe API helper functions and matching interfaces. Do not manually type request payloads or response models.
- **Keep OpenAPI Spec Fresh**: The MCP server parses `api/openapi.json`. Ensure the specification is up-to-date by running verification checks (e.g. `./scripts/verify-all.sh`) or generating the spec using `cargo test` when API signatures change.

## 2. Trigger Conditions

Activate this skill when:
- Creating a new page or feature in the Client portal or Admin portal that fetches or sends data.
- Handling API integration failures, parameter validation issues, or network contract mismatches.
- Resolving type mismatches between frontend API handlers and backend data types.
- Modifying backend Rust Axum endpoints to ensure public OpenAPI outputs map correctly.

## 3. Tool Suite and Best Practices

The plugin exposes four primary tools:

### `list_endpoints`
Lists all available API endpoints grouped by tags (e.g. Auth, Users, Roles).
- **Use Case**: Quick discovery of existing routes when exploring the workspace API architecture.

### `search_endpoints`
Searches paths, summaries, and descriptions for keyword matches (e.g. `query: "roles"`).
- **Use Case**: Quickly locate all operations relating to a specific domain or model entity.

### `get_endpoint_details`
Retrieves dereferenced parameters, request schemas, security definitions, and HTTP responses.
- **Use Case**: Standard reference lookup when building custom forms, checking validation rules, or auditing permissions.

### `generate_typescript_types`
Outputs clean TypeScript interfaces and standard `fetch` API helper clients.
- **Use Case**: Run this whenever starting a new integration. Save the output directly into front-end services (e.g., `client/src/services/` or `admin/src/api/`) or copy-paste it directly to eliminate typing bugs.

## 4. Integration Workflow

1. **Locate Route**: Use `search_endpoints` to find the exact route and HTTP verb.
2. **Inspect Schemas**: Use `get_endpoint_details` to verify required parameters, authentication scopes, and request JSON layout.
3. **Generate & Embed Types**: Use `generate_typescript_types` to output clean types and fetch wrappers. Copy or write the code directly into the frontend repository, updating relative URLs or fetch wrappers accordingly.
