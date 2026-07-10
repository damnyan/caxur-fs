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


}
trap cleanup SIGINT SIGTERM EXIT



echo "🗄️ Running database migrations..."
cd api
cargo sqlx database setup
cd ..

# Start all services concurrently via our custom orchestrator which keeps
# active service URLs pinned as a sticky footer at the bottom of the terminal output
bun run "$SCRIPT_DIR/run-dev-orchestrator.ts"
