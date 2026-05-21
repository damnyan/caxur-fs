---
name: bhu
description: "Create and plan tasks for AI agents, establishing strict architectural mappings, skill matching, and sub-agent allocation guidelines."
---

# 🤖 Agent Task Creation & Planning Workflow (bhu)

This workflow defines the mandatory onboarding, decomposition, and planning process for any AI agent tasked with introducing features or refactoring codebase logic within the **`caxur-fs`** monorepo.

All agents must follow this workflow to ensure that proposed changes adhere strictly to the repository's architectural guardrails, utilize existing skills, leverage workspace MCP servers, and structure sub-agent workloads efficiently.

---

## 📋 Steps

### 1. Ingest & Research
Before drafting any implementation steps, perform thorough discovery:
- Use standard research tools (`grep_search`, `list_dir`, `view_file`) to understand the impacted directories.
- Review target-specific guardrails in `.agents/rules/` (`rust-axum-api.md`, `nextjs-client.md`, `react-admin.md`).

### 2. Generate the Implementation Plan
The agent **MUST** create or update the `implementation_plan.md` artifact. This plan acts as the blueprint for the task and must include the following specific sections:

#### A. Planned Skills to be Used
Explicitly list which of the workspace's `.agents/skills/` will be activated and followed:
- [`rust-axum-api/SKILL.md`](file:///.agents/skills/rust-axum-api/SKILL.md): Activated for any backend API handler, model, repository, database migration, or JSON:API compliance work.
- [`nextjs-client/SKILL.md`](file:///.agents/skills/nextjs-client/SKILL.md): Activated for any client portal layout, form handling, or React Server Component (RSC) work.
- [`react-admin/SKILL.md`](file:///.agents/skills/react-admin/SKILL.md): Activated for administrative dashboard features, Zustand state management, or React Query integrations.

#### B. MCP Servers to be Used
Map exact workspace Model Context Protocol (MCP) servers and tools to be utilized during execution to avoid guessing or manual duplication:
- **`caxur-api-docs`**:
  - Use `search_endpoints` and `get_endpoint_details` to verify Axum endpoint contracts.
  - Use `generate_typescript_types` to produce clean, type-safe API helper functions and fetch interfaces.
- **`context7`**:
  - Use `resolve-library-id` and `query-docs` to retrieve up-to-date documentation on backend crates (e.g., SQLx, Axum, Tower) or frontend technologies (Tailwind CSS v4, Next.js, Shadcn).

#### C. Sub-Agent Spawning Recommendation
Evaluate the task scope and recommend the optimal number of sub-agents to spawn:
- **Rule 1: Single-Service / Low Complexity**: Recommend `0` sub-agents. Work should be executed directly by the primary coordinator.
- **Rule 2: Cross-Service / High Complexity (Full-Stack Features)**: Recommend `2` to `3` sub-agents.
  - *Example*: Spawn `1` sub-agent isolated to `api/` (Rust API changes), `1` sub-agent isolated to `client/` (Next.js client view), and `1` sub-agent isolated to `admin/` (React admin view).
  - *Rationale*: Isolating sub-agents to specific directories avoids context window pollution, prevents parallel merge conflicts, and ensures service-specific skills are applied cleanly.

### 3. Obtain User Approval
- Set `request_feedback = true` in the plan's metadata.
- **STOP** execution immediately and wait for the user's explicit approval. DO NOT perform any write operations or run modifying commands until approved.

### 4. Granular Checklist Execution (`task.md`)
- Create a `task.md` checklist detailing the precise, atomic tasks.
- Keep `task.md` up-to-date, marking in-progress tasks with `[/]` and completed tasks with `[x]`.

### 5. Verification & Clean-up
- Run `scripts/verify-all.sh` to ensure all type-checks, tests, and specs build successfully.
- **Delete all temporary or diagnostic files immediately** after validation to comply with the repo's Clean Repository Guarantee.
- Create a `walkthrough.md` to present verified changes to the user.
