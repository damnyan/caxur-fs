#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Caxur Development Environment..."

# Function to kill process running on a specific port
kill_port() {
  local PORT=$1
  local PID=$(lsof -t -i :$PORT || true)
  if [ -n "$PID" ]; then
    echo "⚠️  Port $PORT is currently in use by PID $PID. Killing it..."
    kill -9 $PID
  fi
}

echo "🧹 Cleaning up potentially conflicting ports..."
kill_port 3000 # API
kill_port 3001 # Admin
kill_port 3002 # Client
kill_port 5173 # MCP Inspector
kill_port 9000 # MinIO API
kill_port 9001 # MinIO Console

# Check if Docker daemon is running and reachable
DOCKER_AVAILABLE=true
if ! docker info > /dev/null 2>&1; then
  echo "⚠️  Cannot connect to Docker daemon. Skipping Docker container checks and startup..."
  DOCKER_AVAILABLE=false
fi

if [ "$DOCKER_AVAILABLE" = true ]; then
  # Check for conflicting docker containers on 5432 or 9000
  CONFLICTING_CONTAINER_DB=$(docker ps -q --filter "publish=5432" || true)
  CONFLICTING_CONTAINER_S3=$(docker ps -q --filter "publish=9000" || true)
  if [ -n "$CONFLICTING_CONTAINER_DB" ]; then
    echo "⚠️  Stopping conflicting Docker container on port 5432..."
    docker stop $CONFLICTING_CONTAINER_DB
  fi
  if [ -n "$CONFLICTING_CONTAINER_S3" ]; then
    echo "⚠️  Stopping conflicting Docker container on port 9000..."
    docker stop $CONFLICTING_CONTAINER_S3
  fi

  echo "📦 Starting API Database and MinIO..."
  cd api
  docker compose up -d db minio

  echo "⏳ Waiting for database to initialize..."
  until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
  done
  cd ..
else
  echo "ℹ️  Assuming database and MinIO are already running locally..."
fi

echo "🗄️ Running database migrations..."
cd api
cargo sqlx database setup
cd ..

echo "⚡ Starting all services concurrently..."
# Use bunx concurrently to run all services
bunx concurrently \
  -c "green,blue,magenta,yellow" \
  -n "API,CLIENT,ADMIN,MCP" \
  "cd api && cargo watch --ignore postgres_data --ignore minio_data -x run" \
  "cd client && bun run dev" \
  "cd admin && bun run dev" \
  "bunx @modelcontextprotocol/inspector bun scripts/mcp-api-docs.ts"
