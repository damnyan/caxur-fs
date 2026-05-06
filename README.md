# Caxur Full-Stack Monorepo

Welcome to the `caxur-fs` project repository! This is a modern, full-stack monorepo featuring a multi-service architecture tailored for robustness, high performance, and an excellent developer experience. 

## 🏗️ Architecture & Stack

This repository contains three primary services:

1. **`client` (Port 3002)**
   - **Framework:** Next.js (App Router)
   - **Styling & UI:** Tailwind CSS v4, Shadcn UI
   - **Description:** The public-facing web client. Adheres to server-first principles and responsive design.

2. **`admin` (Port 3001)**
   - **Framework:** React + Vite
   - **State & Data Fetching:** Zustand, React Query
   - **Styling & UI:** Tailwind CSS v4, Shadcn UI
   - **Description:** The administrative portal for managing the application's underlying data.

3. **`api` (Port 3000)**
   - **Framework:** Rust + Axum
   - **Database:** PostgreSQL (via SQLx)
   - **Description:** A robust, high-performance API adhering to Clean Architecture, Domain-Driven Design (DDD), and JSON:API compliance.

## 🤖 AI Agent Guidelines

If you are an AI Assistant or Agent working on this repository, **you must read and adhere to the project-specific skills** located in `.agents/skills/`. These define the architectural patterns, rules, and best practices for this project.

Available skills:
- `.agents/skills/nextjs-client/SKILL.md`: Strict rules for the Next.js client portal.
- `.agents/skills/react-admin/SKILL.md`: Guidelines for the React/Vite admin dashboard.
- `.agents/skills/rust-axum-api/SKILL.md`: Architecture and design patterns for the Rust Axum API.
- `.agents/skills/setup-project/SKILL.md`: Setup workflow documentation.
- `.agents/skills/run-dev/SKILL.md`: Details about the local development workflow.
- `.agents/skills/verify-commit/SKILL.md`: Details about the pre-commit code verification workflow.

> [!IMPORTANT]
> Always check the corresponding `SKILL.md` file before starting work on a specific service to ensure you follow the project's established conventions (KISS, DRY, YAGNI, proper layer isolation in Rust, etc.).

## 🚀 Getting Started

### 1. Setup the Environment

We provide an automated script to install missing dependencies (Bun, Cargo, SQLx CLI, Docker), scaffold environment files from `.env.example`, and install project packages.

Run the following command from the repository root:
```bash
./scripts/setup.sh
```

### 2. Run the Development Server

You can run all three services (API, Client, Admin) concurrently, along with the required PostgreSQL database via Docker. The script automatically handles port cleanup to avoid conflicts.

```bash
./scripts/run-dev.sh
```

- **API** will be available at `http://localhost:3000`
- **Admin** will be available at `http://localhost:3001`
- **Client** will be available at `http://localhost:3002`

### 3. Verify & Commit

Before pushing code, ensure that all services pass type checking, linting, and tests. A comprehensive verification script is provided to automate this:

```bash
./scripts/verify-all.sh
```

## 📁 Repository Structure

```text
caxur-fs/
├── .agents/          # AI agent skills, workflows, and strict project guidelines
├── admin/            # React/Vite admin dashboard source code
├── api/              # Rust Axum backend source code
├── client/           # Next.js frontend client source code
├── scripts/          # Workflow automation scripts (setup, dev, verify, etc.)
└── README.md         # This file
```
