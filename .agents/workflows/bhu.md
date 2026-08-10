---
name: bhu
description: "Create and plan tasks for AI agents using the AGY CLI /plan workflow, establishing strict architectural mappings, skill matching, sub-agent allocation guidelines, and zero-warning/error build verification."
---

# 🤖 Agent Task Creation & Planning Workflow (bhu)

This workflow defines the mandatory onboarding, decomposition, planning, and verification process for any AI agent tasked with introducing features, refactoring logic, or modifying code within the **`caxur-fs`** monorepo.

It combines the standard **Antigravity (AGY CLI) `/plan` workflow** with **`caxur-fs` architectural guardrails**, workspace skills, custom MCP tools, sub-agent allocation guidelines, and strict build verification.

---

## 📋 Planning Phase Steps

### 1. Ingest & Research
Before drafting any implementation steps, perform thorough discovery:
- Use standard research tools (`grep_search`, `list_dir`, `view_file`) to inspect impacted directories.
- Review target-specific system rules in `.agents/rules/`:
  - [`rust-axum-api.md`](file:///.agents/rules/rust-axum-api.md): Rules for the Rust Axum API backend.
  - [`nextjs-client.md`](file:///.agents/rules/nextjs-client.md): Rules for the Next.js frontend client portal.
  - [`react-admin.md`](file:///.agents/rules/react-admin.md): Rules for the Vite React admin dashboard.

### 2. Generate the Implementation Plan Artifact
The agent **MUST** create or update an implementation plan artifact at `<Artifact Directory>/<plan_name>.md`.

The artifact metadata **MUST** set:
- `user_facing: true`
- `request_feedback: true`

The implementation plan document **MUST** adhere to the official AGY CLI `/plan` schema:

#### Required Implementation Plan Sections:

1. **`## Goal Description`**:
   - Provide a brief description of the problem, background context, and what the proposed changes accomplish.

2. **`## User Review Required`**:
   - Document any breaking changes, significant architectural decisions, or items requiring explicit user feedback.
   - Use GitHub alert syntax (`> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) to highlight critical items.

3. **`## Open Questions`**:
   - List any clarifying technical or design questions for the user that impact execution.

4. **`## Proposed Changes`**:
   - Group proposed file modifications by monorepo component (`api`, `client`, `admin`, `.agents` / shared scripts) and order logically.
   - Separate components with horizontal rules (`---`).
   - For specific files, explicitly use action markers:
     - `#### [MODIFY] file_basename`
     - `#### [NEW] file_basename`
     - `#### [DELETE] file_basename`
   - Include clear code snippets, diffs, and architectural details.

   - **Mandatory `caxur-fs` Integrations inside Proposed Changes**:
     - **A. Workspace Skills Activation**: Explicitly specify which `.agents/skills/` will be activated:
       - [`rust-axum-api/SKILL.md`](file:///.agents/skills/rust-axum-api/SKILL.md): Backend API handlers, models, repositories, migrations, JSON:API v1.1 compliance.
       - [`nextjs-client/SKILL.md`](file:///.agents/skills/nextjs-client/SKILL.md): Next.js App Router, RSC boundaries, URL-synced search/filters, Zod forms.
       - [`react-admin/SKILL.md`](file:///.agents/skills/react-admin/SKILL.md): Feature-based structure, Zustand global state, TanStack Query server state, URL search params sync.
     - **B. Workspace MCP Servers**: Map tools to avoid manual type duplication or outdated docs:
       - **`caxur-api-docs`**: Run `search_endpoints` -> `get_endpoint_details` -> `generate_typescript_types` to integrate endpoints programmatically.
       - **`context7`**: Run `resolve-library-id` -> `query-docs` for up-to-date documentation on Rust crates or React/Next/Tailwind libraries.
     - **C. Sub-Agent Allocation Strategy**:
       - *Single-Service / Low Complexity*: Recommend `0` sub-agents. Primary agent handles execution directly.
       - *Cross-Service / High Complexity (Full-Stack)*: Recommend `2` to `3` sub-agents isolated by service directory (`api/`, `client/`, `admin/`) to avoid context window pollution and parallel merge conflicts.

5. **`## Verification Plan`**:
   - **Automated Tests**: Specify exact commands (`bash scripts/verify-all.sh`, unit tests, type-checks).
   - **Manual Verification**: Detailed steps for manual testing.

---

### 3. Obtain User Approval
- **STOP** execution immediately after creating the implementation plan artifact.
- Do NOT make code changes or run modifying commands until the user explicitly approves the plan artifact.

---

## 🚀 Execution & Verification Phase Steps

### 4. Checklist Tracking (`task.md`)
- Create `<Artifact Directory>/task.md` checklist detailing atomic tasks.
- Keep `task.md` updated during execution: mark in-progress tasks with `[/]` and completed tasks with `[x]`.

### 5. Build Verification & Automatic Warning/Error Fixes
- Run `bash scripts/verify-all.sh` to execute full monorepo verification:
  - Client linting (`--max-warnings 0`) & production build (`bun run build`).
  - Admin linting (`--max-warnings 0`) & production build (`bun run build`).
  - API formatting (`cargo fmt --check`), SQLx prepare (`cargo sqlx prepare`), Clippy lints (`cargo clippy -D warnings`), and unit tests (`cargo test --lib`).
- **CRITICAL**: The build MUST pass with **zero warnings** and **zero errors**.
- If any build warnings, compilation errors, lint errors, or type errors arise, the agent **MUST automatically inspect the logs and fix all warnings and errors** before declaring victory.

### 6. Clean-up & Walkthrough (`walkthrough.md`)
- Delete all temporary diagnostic files, scripts, or mockups created during execution to satisfy the Clean Repository Guarantee.
- Create `<Artifact Directory>/walkthrough.md` summarizing changes made, test results, and visual/code evidence.
