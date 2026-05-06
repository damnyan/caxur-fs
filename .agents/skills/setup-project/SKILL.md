---
name: Setup Project Workflow
description: A workflow to automatically install dependencies and setup environment files for a fresh clone of the repository.
---

# Setup Project Workflow

This skill acts as a standard workflow to quickly bootstrap the `caxur-fs` project stack on a new machine or for a new developer.

## 1. Trigger Condition
Execute this workflow whenever the user asks to "setup the project", "install dependencies", "bootstrap the repo", or "run setup".

## 2. Workflow Steps

1. **Run Setup Script**:
   - Execute the workspace script located at `scripts/setup.sh`.
   - This script will:
     - Check for required system dependencies (`bun`, `cargo`, `sqlx`, `docker`) and install them if they are completely missing.
     - Automatically create `.env.local` for `client` and `admin` using their respective `.env.example` templates.
     - Automatically create `.env` for `api` using its `.env.example` template.
     - Run `bun install` for both the `client` and `admin` directories.
   
2. **Handle Errors**:
   - If the script fails, read the output.
   - If the failure is due to a missing package manager (like `brew` for Docker on macOS) or network issues, guide the user on how to resolve it manually (e.g., providing the link to download Docker Desktop).

3. **Report**:
   - Inform the user that the setup is complete.
   - Instruct the user that they can now use the `run-dev` workflow to start the development environment.
