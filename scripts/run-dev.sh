#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Resolve script directory absolutely to prevent relative path bugs
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Print versions before starting services
API_VERSION=$(cargo metadata --format-version 1 2>/dev/null | node -e "
const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync(0));
  const pkg = data.packages.find(p => p.name === 'caxur');
  console.log(pkg ? pkg.version : '0.1.0');
} catch (e) {
  console.log('0.1.0');
}
" || echo "0.1.0")

CLIENT_VERSION=$(node -p "require('./client/package.json').version" 2>/dev/null || echo "0.1.0")
ADMIN_VERSION=$(node -p "require('./admin/package.json').version" 2>/dev/null || echo "0.0.0")

echo "=================================================="
echo "🚀 Starting Caxur Development Environment..."
echo "🔹 Rust Axum API version:    v$API_VERSION"
echo "🔹 Next.js Client version:   v$CLIENT_VERSION"
echo "🔹 React Vite Admin version:  v$ADMIN_VERSION"
echo "=================================================="

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

# Check if Docker daemon is running and reachable
DOCKER_AVAILABLE=true
if ! docker info > /dev/null 2>&1; then
  echo "⚠️  Cannot connect to Docker daemon. Skipping Docker container checks and startup..."
  DOCKER_AVAILABLE=false
fi

# Cleanup function to shut down docker containers on exit or interrupt
cleanup() {
  if [ "${CLEANUP_DONE:-false}" = "true" ]; then
    return
  fi
  CLEANUP_DONE=true

  echo ""
  echo "🛑 Shutting down development environment..."
  
  # Mark services as offline in urls.md
  "$SCRIPT_DIR/write-urls.sh" offline 2>/dev/null || true

  if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Running docker compose down..."
    # Always run from the api folder relative to the script location
    cd "$SCRIPT_DIR/../api" || true
    docker compose down || true
  fi
}
trap cleanup SIGINT SIGTERM EXIT

# Helper function to check and stop conflicting docker containers
check_and_stop_container() {
  local CONTAINER_ID=$1
  local PORT=$2
  if [ -n "$CONTAINER_ID" ]; then
    local PROJECT=$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project" }}' "$CONTAINER_ID" 2>/dev/null || true)
    if [ "$PROJECT" = "caxur-project" ]; then
      echo "⚠️  Stopping conflicting caxur-project container on port $PORT..."
      docker stop "$CONTAINER_ID" >/dev/null
    else
      echo "❌ Port $PORT is already in use by an external Docker container (project: ${PROJECT:-non-compose})."
      echo "   Please stop this container manually before running the dev environment."
      exit 1
    fi
  fi
}

if [ "$DOCKER_AVAILABLE" = true ]; then
  # Check for conflicting docker containers on 5432, 9000 or 8025
  CONFLICTING_CONTAINER_DB=$(docker ps -q --filter "publish=5432" || true)
  CONFLICTING_CONTAINER_S3=$(docker ps -q --filter "publish=9000" || true)
  CONFLICTING_CONTAINER_MAIL=$(docker ps -q --filter "publish=8025" || true)
  
  check_and_stop_container "$CONFLICTING_CONTAINER_DB" 5432
  check_and_stop_container "$CONFLICTING_CONTAINER_S3" 9000
  check_and_stop_container "$CONFLICTING_CONTAINER_MAIL" 8025

  echo "📦 Starting API Database, MinIO, and Mailpit..."
  cd api
  docker compose up -d db minio mailpit

  echo "⏳ Waiting for database to initialize..."
  until docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
  done
  cd ..
else
  echo "ℹ️  Assuming database, MinIO, and Mailpit are already running locally..."
fi

echo "🗄️ Running database migrations..."
cd api
cargo sqlx database setup
cd ..

# Start all services concurrently via our custom orchestrator which keeps
# active service URLs pinned as a sticky footer at the bottom of the terminal output
bun run "$SCRIPT_DIR/run-dev-orchestrator.ts"
