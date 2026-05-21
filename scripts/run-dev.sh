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

# Check for conflicting docker containers on 5432
CONFLICTING_CONTAINER=$(docker ps -q --filter "publish=5432")
if [ -n "$CONFLICTING_CONTAINER" ]; then
  echo "⚠️  Stopping conflicting Docker container(s) on port 5432..."
  docker stop $CONFLICTING_CONTAINER
fi

echo "📦 Starting API Database..."
cd api
docker compose up -d db

echo "⏳ Waiting for database to initialize..."
until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "🗄️ Running database migrations..."
cargo sqlx database setup
cd ..

echo "⚡ Starting all services concurrently..."
# Use bunx concurrently to run all services
bunx concurrently \
  -c "green,blue,magenta,yellow" \
  -n "API,CLIENT,ADMIN,MCP" \
  "cd api && cargo watch -x run" \
  "cd client && bun run dev" \
  "cd admin && bun run dev" \
  "bunx @modelcontextprotocol/inspector bun scripts/mcp-api-docs.ts"
