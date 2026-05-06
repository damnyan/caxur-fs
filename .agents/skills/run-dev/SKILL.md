---
name: Run Development Workflow
description: A workflow to start the entire development stack (API, Client, and Admin) simultaneously.
---

# Run Development Workflow

This skill acts as a standard workflow to quickly spin up the entire `caxur-fs` project stack for local development.

## 1. Trigger Condition
Execute this workflow whenever the user asks to "run dev", "start the environment", "boot up project", or "start development".

## 2. Workflow Steps

1. **Run Development Script**:
   - Execute the workspace script located at `scripts/run-dev.sh`.
   - This script will:
     - Terminate any dangling processes on ports `3000` (API), `3001` (Admin), and `3002` (Client).
     - Start the Postgres database container for the API (`docker compose up -d db`).
     - Start the API (`cargo watch`), Client (`bun run dev`), and Admin (`bun run dev`) concurrently using `bunx concurrently`.
   
2. **Monitor Output**:
   - The script will output logs prefixed with `[API]`, `[CLIENT]`, and `[ADMIN]`.
   - Wait for the services to initialize. If any service fails to start or throws an error during initialization, read the logs to identify the issue.

3. **Handle Errors**:
   - If the script fails, identify which service failed and suggest a fix to the user.
   - You can use the logs to determine if there's a port conflict that wasn't resolved, a database connection issue, or a missing dependency.

4. **Report**:
   - Once the script is running successfully, inform the user that the development environment is up and running. Provide them with the local URLs for each service:
     - API: `http://localhost:3000`
     - Admin: `http://localhost:3001`
     - Client: `http://localhost:3002`
