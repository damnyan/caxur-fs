---
name: run-dev
description: Start the entire development stack (API, Client, and Admin) concurrently.
---

# Run Development Skill

This skill spins up the entire `caxur-fs` project stack for local development.

## Steps

1. **Run Development Script**:
   - Execute the workspace script located at `scripts/run-dev.sh`.
   - This script:
     - Terminates dangling processes on ports `3000` (API), `3001` (Admin), `3002` (Client), and `5173` (MCP Inspector).
     - Runs database migrations via `cargo sqlx database setup`.
     - Starts all services concurrently using `scripts/run-dev-orchestrator.ts`.

2. **Monitor Logs & Startup**:
   - Monitor process logs for `API`, `CLIENT`, `ADMIN`, and `MCP-DOCS`.
   - The orchestrator maintains a real-time status bar at the bottom of stdout.
   - Wait for services to successfully initialize. If any service fails, inspect logs to find the root cause (e.g. port conflict or DB connection failure).

3. **Provide URLs**:
   - Once all servers are active, present the access URLs to the user:
     - **API Service**: `http://localhost:3000`
     - **Admin Portal**: `http://localhost:3001`
     - **Client Portal**: `http://localhost:3002`
     - **MCP Docs Inspector**: `http://localhost:5173`
