---
name: run-dev
description: "Start the entire development stack (API, Client, and Admin) concurrently."
---

# Run Development Workflow

This workflow spins up the entire `caxur-fs` project stack for local development.

## Steps

1. **Run Development Script**:
   - Execute the workspace script located at `scripts/run-dev.sh`.
   - This script:
     - Terminates dangling processes on ports `3000` (API), `3001` (Admin), and `3002` (Client).
     - Starts the Postgres database and MinIO storage containers (`docker compose up -d db minio`).
     - Starts the API (`cargo watch`), Client (`bun run dev`), and Admin (`bun run dev`) concurrently using `bunx concurrently`.

2. **Monitor Logs & Startup**:
   - Monitor the logs prefixed with `[API]`, `[CLIENT]`, and `[ADMIN]`.
   - Wait for services to successfully initialize. If any service fails, inspect logs to find the root cause (e.g. port conflict or DB connection failure).

3. **Provide URLs**:
   - Once all servers are active, present the access URLs to the user:
     - **API Service**: `http://localhost:3000`
     - **Admin Portal**: `http://localhost:3001`
     - **Client Portal**: `http://localhost:3002`
     - **MinIO S3 Console**: `http://localhost:9001` (Username/Password: `minioadmin` / `minioadmin`)
     - **MinIO S3 API**: `http://localhost:9000`
