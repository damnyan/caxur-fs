---
name: setup-project
description: "Bootstrap the caxur-fs project stack: install dependencies and setup env files."
---

# Setup Project Workflow

This workflow automates bootstrapping the `caxur-fs` project stack on a new machine or for a fresh development session.

## Steps

1. **Run Setup Script**:
   - Execute the workspace script located at `scripts/setup.sh`.
   - This script will:
     - Check for required system dependencies (`bun`, `cargo`, `sqlx`, `docker`) and install them if missing.
     - Automatically create `.env.local` for the `client` and `admin` portals using their respective `.env.example` templates.
     - Automatically create `.env` for the `api` service using its `.env.example` template.
     - Run `bun install` for both the `client` and `admin` directories.

2. **Error Recovery**:
   - If the script fails, analyze the error output.
   - For missing system level managers (e.g., `brew` on macOS for Docker), guide the user on how to install them manually.
   - Re-run or resume once dependencies are resolved.

3. **Next Steps**:
   - Once setup completes, tell the user they can now run the `/run-dev` command to start development.
