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

# Check for conflicting docker containers on 5432
CONFLICTING_CONTAINER=$(docker ps -q --filter "publish=5432")
if [ -n "$CONFLICTING_CONTAINER" ]; then
  echo "⚠️  Stopping conflicting Docker container(s) on port 5432..."
  docker stop $CONFLICTING_CONTAINER
fi

echo "📦 Starting API Database..."
cd api
docker compose up -d db
cd ..

echo "⚡ Starting all services concurrently..."
# Use bunx concurrently to run all three services
bunx concurrently \
  -c "green,blue,magenta" \
  -n "API,CLIENT,ADMIN" \
  "cd api && cargo watch -x run" \
  "cd client && bun run dev" \
  "cd admin && bun run dev"
