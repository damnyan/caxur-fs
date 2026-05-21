---
name: context7-docs
description: "Resolve dependency documentation and library specifications using the context7 plugin toolset."
---

# Context7 Documentation & Library Resolver Skill

This skill guides the agent on when and how to utilize the `context7` workspace plugin's capabilities to query and resolve documentation for libraries, frameworks, SDKs, and APIs.

## 1. Core Guidelines

- **Always Query for Library Context**: Use the `context7` tools (`resolve-library-id`, `query-docs`) to fetch current documentation whenever working with libraries, frameworks, SDKs, APIs, CLI tools, or cloud services (e.g. React, Next.js, Prisma, Express, Tailwind, Axum, SQLx).
- **Prefer Over Generic Web Search**: For direct documentation questions, use `context7` rather than standard web searches, as it is faster and targets accurate API specs.
- **Do Not Guess**: Version migrations (like Tailwind v4 or React 19) and library configurations evolve rapidly. Query `context7` even when you think you know the syntax.

## 2. Trigger Conditions

Activate this skill when:
- Resolving compiler errors related to imported libraries (e.g. Next.js, Axum, tower-http).
- Verifying the exact API contracts of third-party Rust crates or JS/TS packages.
- Bootstrapping or customizing configurations for build tools, web frameworks, or databases.

## 3. Best Practices

- **Step 1: Resolve Library ID**: Call the `resolve-library-id` tool first if the library name or ID is ambiguous or needs to be mapped to a specific context.
- **Step 2: Query Documentation**: Call the `query-docs` tool with targeted queries (e.g. specific function signatures, routing settings, component properties) to retrieve exact code templates and integration specs.
- **Scope Limit**:
  - Do NOT use for general refactoring, business logic debugging, or general programming concepts.
  - ONLY use to obtain precise third-party library reference details.
